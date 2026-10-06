import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  TipoEmpleado,
} from '@prisma/client';

import { DateTime } from 'luxon';

import { PrismaService } from 'src/prisma/prisma.service';

import { FilaRanking } from './interface/ranking.interface';
import { GrupoRanking } from './types/ranking.type';

import { ConfigRankingService } from 'src/config-ranking/config-ranking.service';


@Injectable()
export class VisorService {

  private readonly limiteRanking = 10;


  constructor(
    private readonly prisma: PrismaService,
    private readonly configRankingService: ConfigRankingService,
  ) {}


  // ============================================================
  // TODA LA DATA EN UNA SOLA PETICIÓN PARA EL FRONTEND
  // ============================================================

  async getAllData(
    sedeId: number,
  ) {

    return {

      sede:
        await this.getSede(
          sedeId,
        ),

      rankingAgenteSede:
        await this.leaderboardAgentesPorSede(
          sedeId,
        ),

      rankingGlobalAgente:
        await this.leaderboardAgentes(),

      rankingGlobalCerrador:
        await this.leaderboardCerradores(),

      sedesStatsDiario:
        await this.statsDiarioPorSede(),

      rankingRango:
        await this.getRangoFechas(),

      flyerSede:
        await this.getFlyersPorSede(
          sedeId,
        ),

      time:
        this.getCurrentTime(),

    };
  }


  // ============================================================
  // NORMALIZAR URL
  // ============================================================

  private normalizeUrl(
    url: string,
  ): string {

    return url.replace(
      /\\/g,
      '/',
    );
  }


  // ============================================================
  // OBTENER SEDE
  // ============================================================

  async getSede(
    sedeId: number,
  ) {

    const response =
      await this.prisma.sede.findUnique({

        where: {
          id: sedeId,
        },

        select: {
          id: true,
          nombre: true,
        },

      });


    if (!response) {

      throw new NotFoundException(
        `Sede no encontrado.`,
      );
    }


    return {

      id:
        response.id,

      nombre:
        response.nombre ===
        'TOMAS VALLE'

          ? 'TOMAS V.'

          : response.nombre ===
            'BACKOFFICE'

            ? 'BO'

            : response.nombre,

    };
  }


  // ============================================================
  // RANGO CONFIGURADO
  // ============================================================

  async getRangoFechas() {

    return this.configRankingService.obtener();
  }


  // ============================================================
  // VALIDAR SEDE
  // ============================================================

  private validarSedeId(
    sedeId: number,
  ): void {

    if (
      !Number.isInteger(sedeId) ||
      sedeId <= 0
    ) {

      throw new BadRequestException(
        'sedeId debe ser un entero positivo',
      );
    }
  }


  // ============================================================
  // PERIODO GLOBAL
  // ============================================================

  private obtenerPeriodoGlobal() {

    return this.configRankingService.obtenerRangoVigente();
  }


  // ============================================================
  // PERIODO DIARIO
  // HOY 00:00 HASTA MAÑANA 00:00 EN LIMA
  // ============================================================

  private obtenerPeriodoDiario(): {
    inicio: DateTime;
    fin: DateTime;
  } {

    const inicio =
      DateTime.now()
        .setZone(
          'America/Lima',
        )
        .startOf(
          'day',
        );


    return {

      inicio,

      fin:
        inicio.plus({
          days: 1,
        }),

    };
  }


  // ============================================================
  // STATS DIARIOS POR SEDE
  //
  // IMPORTANTE:
  //
  // - Se cuentan únicamente ventas cuya fecha_tramitacion
  //   corresponde al día actual.
  //
  // - fecha_lima NO determina si la venta entra o no.
  //
  // - fecha_lima solamente sirve para desempatar sedes
  //   con la misma cantidad de ventas.
  // ============================================================

  async statsDiarioPorSede(
    tipoEmpleado: TipoEmpleado =
      TipoEmpleado.AGENTE,
  ) {

    const {
      inicio,
      fin,
    } =
      this.obtenerPeriodoDiario();


    return this.obtenerEstadisticasDiariasPorSede(
      tipoEmpleado,
      inicio,
      fin,
    );
  }


  // ============================================================
  // OBTENER ESTADÍSTICAS DIARIAS POR SEDE
  // ============================================================

  private async obtenerEstadisticasDiariasPorSede(
    tipoEmpleado: TipoEmpleado,
    inicio: DateTime,
    fin: DateTime,
  ) {

    /*
     * fecha_tramitacion está almacenada como:
     *
     * 2026-10-06 00:00:00
     *
     * por lo tanto:
     *
     * inicio = 2026-10-06 00:00
     * fin    = 2026-10-07 00:00
     *
     * permitirá traer exclusivamente
     * las ventas tramitadas hoy.
     */

    const [
      ventas,
      sedes,
    ] =
      await Promise.all([

        this.prisma.venta.findMany({

          where: {

            tipo_empleado:
              tipoEmpleado,

            fecha_tramitacion: {

              gte:
                this.fechaLimaParaBD(
                  inicio,
                ),

              lt:
                this.fechaLimaParaBD(
                  fin,
                ),

            },

          },

          select: {

            id:
              true,

            sede_id:
              true,

            /*
             * Solo se necesita para
             * determinar quién vendió primero
             * cuando existe un empate.
             */
            fecha_lima:
              true,

          },

        }),


        this.prisma.sede.findMany({

          select: {

            id:
              true,

            nombre:
              true,

          },

        }),

      ]);


    // ==========================================================
    // MAPA DE NOMBRES DE SEDE
    // ==========================================================

    const nombres =
      new Map(

        sedes.map(
          (sede) => [

            sede.id,
            sede.nombre,

          ],
        ),

      );


    // ==========================================================
    // ACUMULACIÓN POR SEDE
    // ==========================================================

    const resultados =
      new Map<
        number | null,
        {

          sede_id:
            number | null;

          sede:
            string;

          cantidad:
            number;

          /*
           * Timestamp de la primera
           * venta del día de esta sede.
           */
          primeraVenta:
            number;

          /*
           * Desempate final en caso
           * dos registros tengan exactamente
           * la misma fecha_lima.
           */
          primerId:
            number;

        }
      >();


    let totalVentas = 0;


    // ==========================================================
    // RECORRER VENTAS
    // ==========================================================

    for (
      const venta
      of ventas
    ) {

      const nombre =

        venta.sede_id === null

          ? undefined

          : nombres.get(
              venta.sede_id,
            );


      /*
       * BACKOFFICE continúa tratándose
       * como VENTA SIN SEDE,
       * respetando tu lógica anterior.
       */

      const sinSede =

        !nombre?.trim() ||

        nombre
          .trim()
          .toUpperCase() ===
          'BACKOFFICE';


      const sedeId =

        sinSede

          ? null

          : venta.sede_id;


      const sedeNombre =

        sinSede

          ? 'VENTA SIN SEDE'

          : nombre!;


      /*
       * fecha_lima solamente sirve
       * para determinar qué sede
       * realizó primero una venta.
       */

      const fechaVenta =

        venta.fecha_lima

          ? venta.fecha_lima.getTime()

          : Number.MAX_SAFE_INTEGER;


      totalVentas++;


      const acumulado =
        resultados.get(
          sedeId,
        );


      // ========================================================
      // PRIMERA VENTA DE LA SEDE
      // ========================================================

      if (!acumulado) {

        resultados.set(
          sedeId,
          {

            sede_id:
              sedeId,

            sede:
              sedeNombre,

            cantidad:
              1,

            primeraVenta:
              fechaVenta,

            primerId:
              venta.id,

          },
        );


        continue;
      }


      // ========================================================
      // INCREMENTAR CANTIDAD
      // ========================================================

      acumulado.cantidad++;


      // ========================================================
      // ACTUALIZAR PRIMERA VENTA
      // ========================================================

      if (

        fechaVenta <
          acumulado.primeraVenta

        ||

        (
          fechaVenta ===
            acumulado.primeraVenta

          &&

          venta.id <
            acumulado.primerId
        )

      ) {

        acumulado.primeraVenta =
          fechaVenta;

        acumulado.primerId =
          venta.id;

      }

    }


    // ==========================================================
    // ORDEN
    //
    // 1. Mayor cantidad de ventas
    // 2. Primera venta realizada
    // 3. ID más antiguo como último desempate
    // ==========================================================

    const ordenados =

      [
        ...resultados.values(),
      ]
        .sort(
          (
            a,
            b,
          ) =>

            b.cantidad -
              a.cantidad

            ||

            a.primeraVenta -
              b.primeraVenta

            ||

            a.primerId -
              b.primerId

            ||

            a.sede.localeCompare(
              b.sede,
              'es',
            ),
        );


    // ==========================================================
    // RESPUESTA
    // ==========================================================

    return {

      periodo:
        'DIARIO',

      total_ventas:
        totalVentas,

      sedes:

        ordenados.map(
          (
            {
              primeraVenta,
              primerId,
              ...sede
            },
            index,
          ) => ({

            puesto:
              index + 1,

            ...sede,

            sede:

              sede.sede ===
              'TOMAS VALLE'

                ? 'TOMAS V.'

                : sede.sede,

          }),
        ),

    };
  }


  // ============================================================
  // ESTADÍSTICAS DEL PERIODO GLOBAL
  //
  // ESTE MÉTODO SE MANTIENE INDEPENDIENTE.
  // NO UTILIZA LA NUEVA REGLA DE STATS DIARIOS.
  // ============================================================

  async statsPeriodoPorSede(
    tipoEmpleado: TipoEmpleado =
      TipoEmpleado.AGENTE,
  ) {

    const {
      config,
      inicio,
      fin,
    } =
      await this.obtenerPeriodoGlobal();


    return this.obtenerEstadisticasPorSede(
      tipoEmpleado,
      config.modo,
      inicio,
      fin,
    );
  }


  // ============================================================
  // ESTADÍSTICAS GENERALES POR SEDE
  // ============================================================

  private async obtenerEstadisticasPorSede(
    tipoEmpleado: TipoEmpleado,
    periodo: string,
    inicio: DateTime,
    fin: DateTime,
  ) {

    const [
      conteos,
      sedes,
    ] =
      await Promise.all([

        this.prisma.venta.groupBy({

          by: [
            'sede_id',
          ],

          where: {

            tipo_empleado:
              tipoEmpleado,

            fecha: {

              gte:
                this.fechaLimaParaBD(
                  inicio,
                ),

              lt:
                this.fechaLimaParaBD(
                  fin,
                ),

            },

          },

          _count: {

            _all:
              true,

          },

        }),


        this.prisma.sede.findMany({

          select: {

            id:
              true,

            nombre:
              true,

          },

        }),

      ]);


    const nombres =
      new Map(

        sedes.map(
          (sede) => [

            sede.id,
            sede.nombre,

          ],
        ),

      );


    const resultados =
      new Map<
        number | null,
        {

          sede_id:
            number | null;

          sede:
            string;

          cantidad:
            number;

        }
      >();


    let totalVentas = 0;


    for (
      const registro
      of conteos
    ) {

      const nombre =

        registro.sede_id === null

          ? undefined

          : nombres.get(
              registro.sede_id,
            );


      const sinSede =

        !nombre?.trim()

        ||

        nombre
          .trim()
          .toUpperCase() ===
          'BACKOFFICE';


      const sedeId =

        sinSede

          ? null

          : registro.sede_id;


      const sedeNombre =

        sinSede

          ? 'VENTA SIN SEDE'

          : nombre!;


      const cantidad =
        registro._count._all;


      totalVentas +=
        cantidad;


      const acumulado =
        resultados.get(
          sedeId,
        );


      if (acumulado) {

        acumulado.cantidad +=
          cantidad;

      } else {

        resultados.set(
          sedeId,
          {

            sede_id:
              sedeId,

            sede:
              sedeNombre,

            cantidad,

          },
        );

      }

    }


    return {

      periodo,

      total_ventas:
        totalVentas,

      sedes:

        [
          ...resultados.values(),
        ]

          .sort(
            (
              a,
              b,
            ) =>

              b.cantidad -
                a.cantidad

              ||

              a.sede.localeCompare(
                b.sede,
                'es',
              ),
          )

          .map(
            (
              sede,
              index,
            ) => ({

              puesto:
                index + 1,

              ...sede,

              sede:

                sede.sede ===
                'TOMAS VALLE'

                  ? 'TOMAS V.'

                  : sede.sede,

            }),
          ),

    };
  }


  // ============================================================
  // RANKING DIARIO DE AGENTES POR SEDE
  // ============================================================

  async getRankingDiarioDeAsesoresPorSede(
    sedeId: number,
  ) {

    this.validarSedeId(
      sedeId,
    );


    const {
      inicio,
      fin,
    } =
      this.obtenerPeriodoDiario();


    return this.obtenerRanking(

      TipoEmpleado.AGENTE,

      inicio,

      fin,

      sedeId,

    );
  }


  // ============================================================
  // RANKING AGENTES POR SEDE
  // PERIODO GLOBAL
  // ============================================================

  async leaderboardAgentesPorSede(
    sedeId: number,
  ) {

    this.validarSedeId(
      sedeId,
    );


    const {
      inicio,
      fin,
    } =
      await this.obtenerPeriodoGlobal();


    return this.obtenerRanking(

      TipoEmpleado.AGENTE,

      inicio,

      fin,

      sedeId,

      this.limiteRanking,

    );
  }


  // ============================================================
  // RANKING GLOBAL DE CERRADORES
  // ============================================================

  async leaderboardCerradores():
    Promise<FilaRanking[]> {

    const {
      inicio,
      fin,
    } =
      await this.obtenerPeriodoGlobal();


    return this.obtenerRanking(

      TipoEmpleado.CERRADOR,

      inicio,

      fin,

      undefined,

      this.limiteRanking,

    );
  }


  // ============================================================
  // RANKING GLOBAL DE AGENTES
  // ============================================================

  async leaderboardAgentes():
    Promise<FilaRanking[]> {

    const {
      inicio,
      fin,
    } =
      await this.obtenerPeriodoGlobal();


    return this.obtenerRanking(

      TipoEmpleado.AGENTE,

      inicio,

      fin,

      undefined,

      this.limiteRanking,

    );
  }


  // ============================================================
  // OBTENER RANKING
  // ============================================================

  private async obtenerRanking(
    tipoEmpleado: TipoEmpleado,
    inicio: DateTime,
    fin: DateTime,
    sedeId?: number,
    limite?: number,
  ) {

    const where:
      Prisma.VentaWhereInput = {

        tipo_empleado:
          tipoEmpleado,

        fecha: {

          gte:
            this.fechaLimaParaBD(
              inicio,
            ),

          lt:
            this.fechaLimaParaBD(
              fin,
            ),

        },

      };


    if (
      sedeId !== undefined
    ) {

      where.sede_id =
        sedeId;

    }


    const ventas =
      await this.prisma.venta.findMany({

        where,

        select: {

          id:
            true,

          nombre_empleado:
            true,

          variante_empleado:
            true,

          sede_id:
            true,

          campaign_id:
            true,

          fecha_lima:
            true,

          sede: {

            select: {

              id:
                true,

              nombre:
                true,

            },

          },

          campaign: {

            select: {

              id:
                true,

              nombre:
                true,

              hex:
                true,

              logo_url:
                true,

            },

          },

        },

      });


    const grupos =
      new Map<
        string,
        GrupoRanking
      >();


    for (
      const venta
      of ventas
    ) {

      const nombre =
        this.normalizarNombre(
          venta.nombre_empleado,
        );


      if (
        !nombre ||
        nombre === 'DESCONOCIDO'
      ) {

        continue;
      }


      const clave =
        JSON.stringify([

          nombre,

          venta.variante_empleado,

          venta.sede_id,

          venta.campaign_id,

        ]);


      if (
        !venta.fecha_lima
      ) {

        continue;
      }


      const fecha =
        venta.fecha_lima.getTime();


      const grupo =
        grupos.get(
          clave,
        );


      if (!grupo) {

        grupos.set(
          clave,
          {

            nombre,

            variante:
              venta.variante_empleado,

            cantidad:
              1,

            sede:
              venta.sede,

            campaign:
              venta.campaign,

            primeraVenta:
              fecha,

            primerId:
              venta.id,

          },
        );


        continue;
      }


      grupo.cantidad++;


      if (

        fecha <
          grupo.primeraVenta

        ||

        (
          fecha ===
            grupo.primeraVenta

          &&

          venta.id <
            grupo.primerId
        )

      ) {

        grupo.primeraVenta =
          fecha;

        grupo.primerId =
          venta.id;

      }

    }


    const ordenados =
      [
        ...grupos.values(),
      ]
        .sort(
          (
            a,
            b,
          ) =>

            b.cantidad -
              a.cantidad

            ||

            a.primeraVenta -
              b.primeraVenta

            ||

            a.primerId -
              b.primerId,
        );


    const seleccionados =

      limite === undefined

        ? ordenados

        : ordenados.slice(
            0,
            limite,
          );


    return seleccionados.map(
      (
        grupo,
        index,
      ) => ({

        puesto:
          index + 1,

        nombre:
          grupo.nombre,

        variante:
          grupo.variante,

        cantidad:
          grupo.cantidad,

        sede:
          grupo.sede,

        campaign:

          grupo.campaign

            ? {

                ...grupo.campaign,

                logo_url:

                  grupo.campaign
                    .logo_url

                    ? this.normalizeUrl(
                        `${process.env.BASE_URL}/${grupo.campaign.logo_url}`,
                      )

                    : null,

              }

            : null,

      }),
    );
  }


  // ============================================================
  // FECHA LIMA PARA MYSQL
  // ============================================================

  private fechaLimaParaBD(
    fecha: DateTime,
  ): Date {

    const local =
      fecha.setZone(
        'America/Lima',
      );


    if (
      !local.isValid
    ) {

      throw new InternalServerErrorException(
        'Fecha Lima inválida para consulta',
      );
    }


    /*
     * Las columnas están manejándose
     * como DATETIME local.
     *
     * Por ejemplo:
     *
     * 2026-10-06 00:00 Lima
     *
     * debe enviarse a MySQL como:
     *
     * 2026-10-06 00:00:00
     *
     * sin convertirlo físicamente
     * a las 05:00 UTC.
     */

    return local

      .setZone(
        'UTC',
        {
          keepLocalTime:
            true,
        },
      )

      .toJSDate();
  }


  // ============================================================
  // NORMALIZAR NOMBRE
  // ============================================================

  private normalizarNombre(
    nombre: string,
  ): string {

    return nombre

      .trim()

      .toUpperCase()

      .normalize(
        'NFD',
      )

      /*
       * Elimina acentos y diéresis,
       * conservando Ñ.
       */
      .replace(
        /[\u0300\u0301\u0302\u0308]/g,
        '',
      )

      .normalize(
        'NFC',
      )

      .replace(
        /\s+/g,
        ' ',
      );
  }


  // ============================================================
  // FLYERS
  // ============================================================

  async getFlyersPorSede(
    sedeId: number,
  ) {

    const sede =
      await this.prisma.sede.findUniqueOrThrow({

        where: {
          id: sedeId,
        },

        include: {

          medias: {

            include: {

              media:
                true,

            },

          },

        },

      });


    return {

      ...sede,

      medias:

        sede.medias

          ? sede.medias.map(
              (sede) => ({

                id:
                  sede.media.id,

                url:
                  this.normalizeUrl(
                    `${process.env.BASE_URL}/${sede.media.url}`,
                  ),

                prioridad:
                  sede.prioridad,

                inicio:
                  sede.started_at,

                fin:
                  sede.ended_at,

                mimetype:
                  sede.media.mimeType,

                duracionms:
                  sede.media.durationMs,

              }),
            )

          : [],

    };
  }


  // ============================================================
  // HORA ACTUAL
  // ============================================================

  getCurrentTime() {

    return {

      utc:
        new Date()
          .toISOString(),

    };
  }

}