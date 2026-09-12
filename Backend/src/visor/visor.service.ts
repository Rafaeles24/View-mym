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
  constructor(
    private readonly prisma: PrismaService,
    private readonly configRankingService: ConfigRankingService,
  ) {}

  private readonly fechaGuardadaEnUTC = true;

  private normalizeUrl(url: string): string {
    return url.replace(/\\/g, '/');
  }

  async getSede(sedeId: number) {
    return this.prisma.sede.findFirst({
      where: { id: sedeId },
    });
  }

  async getRangoFechas() {
    return this.prisma.configRanking.findMany();
  }

  private validarSedeId(sedeId: number): void {
    if (!Number.isInteger(sedeId) || sedeId <= 0) {
      throw new BadRequestException(
        'sedeId debe ser un entero positivo',
      );
    }
  }

  private obtenerPeriodoGlobal() {
    return this.configRankingService.obtenerRangoVigente();
  }

  private obtenerPeriodoDiario(): {
    inicio: DateTime;
    fin: DateTime;
  } {
    const inicio = DateTime.now()
      .setZone('America/Lima')
      .startOf('day');

    return {
      inicio,
      fin: inicio.plus({ days: 1 }),
    };
  }

  // ESTADÍSTICAS DIARIAS

  async statsDiarioPorSede(
    tipoEmpleado: TipoEmpleado = TipoEmpleado.AGENTE,
  ) {
    const { inicio, fin } = this.obtenerPeriodoDiario();

    return this.obtenerEstadisticasPorSede(
      tipoEmpleado,
      'DIARIO',
      inicio,
      fin,
    );
  }

  // ESTADÍSTICAS DEL PERIODO GLOBAL

  async statsPeriodoPorSede(
    tipoEmpleado: TipoEmpleado = TipoEmpleado.AGENTE,
  ) {
    const { config, inicio, fin } =
      await this.obtenerPeriodoGlobal();

    return this.obtenerEstadisticasPorSede(
      tipoEmpleado,
      config.modo,
      inicio,
      fin,
    );
  }

  private async obtenerEstadisticasPorSede(
    tipoEmpleado: TipoEmpleado,
    periodo: string,
    inicio: DateTime,
    fin: DateTime,
  ) {
    const [conteos, sedes] = await Promise.all([
      this.prisma.venta.groupBy({
        by: ['sede_id'],
        where: {
          tipo_empleado: tipoEmpleado,
          fecha: {
            gte: this.fechaParaBD(inicio),
            lt: this.fechaParaBD(fin),
          },
        },
        _count: {
          _all: true,
        },
      }),

      this.prisma.sede.findMany({
        select: {
          id: true,
          nombre: true,
        },
      }),
    ]);

    const nombres = new Map(
      sedes.map((sede) => [sede.id, sede.nombre]),
    );

    const resultados = new Map<
      number | null,
      {
        sede_id: number | null;
        sede: string;
        cantidad: number;
      }
    >();

    let totalVentas = 0;

    for (const registro of conteos) {
      const nombre =
        registro.sede_id === null
          ? undefined
          : nombres.get(registro.sede_id);

      const sinSede =
        !nombre?.trim() ||
        nombre.trim().toUpperCase() === 'BACKOFFICE';

      const sedeId = sinSede ? null : registro.sede_id;
      const sedeNombre = sinSede ? 'VENTA SIN SEDE' : nombre!;
      const cantidad = registro._count._all;

      totalVentas += cantidad;

      const acumulado = resultados.get(sedeId);

      if (acumulado) {
        acumulado.cantidad += cantidad;
      } else {
        resultados.set(sedeId, {
          sede_id: sedeId,
          sede: sedeNombre,
          cantidad,
        });
      }
    }

    return {
      periodo,
      total_ventas: totalVentas,
      sedes: [...resultados.values()]
        .sort(
          (a, b) =>
            b.cantidad - a.cantidad ||
            a.sede.localeCompare(b.sede, 'es'),
        )
        .map((sede, index) => ({
          puesto: index + 1,
          ...sede,
        })),
    };
  }

  // RANKING DIARIO DE AGENTES POR SEDE

  async getRankingDiarioDeAsesoresPorSede(sedeId: number) {
    this.validarSedeId(sedeId);

    const { inicio, fin } = this.obtenerPeriodoDiario();

    return this.obtenerRanking(
      TipoEmpleado.AGENTE,
      inicio,
      fin,
      sedeId,
    );
  }

  // RANKING DE AGENTES POR SEDE: PERIODO GLOBAL, TOP 10

  async leaderboardAgentesPorSede(sedeId: number) {
    this.validarSedeId(sedeId);

    const { inicio, fin } = await this.obtenerPeriodoGlobal();

    return this.obtenerRanking(
      TipoEmpleado.AGENTE,
      inicio,
      fin,
      sedeId,
      10,
    );
  }

  // RANKING GLOBAL DE CERRADORES

  async leaderboardCerradores(): Promise<FilaRanking[]> {
    const { inicio, fin } = await this.obtenerPeriodoGlobal();

    return this.obtenerRanking(
      TipoEmpleado.CERRADOR,
      inicio,
      fin,
    );
  }

  // RANKING GLOBAL DE AGENTES

  async leaderboardAgentes(): Promise<FilaRanking[]> {
    const { inicio, fin } = await this.obtenerPeriodoGlobal();

    return this.obtenerRanking(
      TipoEmpleado.AGENTE,
      inicio,
      fin,
    );
  }

  private async obtenerRanking(
    tipoEmpleado: TipoEmpleado,
    inicio: DateTime,
    fin: DateTime,
    sedeId?: number,
    limite?: number,
  ) {
    const where: Prisma.VentaWhereInput = {
      tipo_empleado: tipoEmpleado,
      fecha: {
        gte: this.fechaParaBD(inicio),
        lt: this.fechaParaBD(fin),
      },
    };

    if (sedeId !== undefined) {
      where.sede_id = sedeId;
    }

    const ventas = await this.prisma.venta.findMany({
      where,
      select: {
        id: true,
        nombre_empleado: true,
        variante_empleado: true,
        sede_id: true,
        campaign_id: true,
        fecha: true,
        sede: {
          select: {
            id: true,
            nombre: true,
          },
        },
        campaign: {
          select: {
            id: true,
            nombre: true,
            hex: true,
            logo_url: true,
          },
        },
      },
    });

    const grupos = new Map<string, GrupoRanking>();

    for (const venta of ventas) {
      const nombre = this.normalizarNombre(
        venta.nombre_empleado,
      );

      if (!nombre || nombre === 'DESCONOCIDO') {
        continue;
      }

      const clave = JSON.stringify([
        nombre,
        venta.variante_empleado,
        venta.sede_id,
        venta.campaign_id,
      ]);

      const fecha = venta.fecha.getTime();
      const grupo = grupos.get(clave);

      if (!grupo) {
        grupos.set(clave, {
          nombre,
          variante: venta.variante_empleado,
          cantidad: 1,
          sede: venta.sede,
          campaign: venta.campaign,
          primeraVenta: fecha,
          primerId: venta.id,
        });

        continue;
      }

      grupo.cantidad++;

      if (
        fecha < grupo.primeraVenta ||
        (
          fecha === grupo.primeraVenta &&
          venta.id < grupo.primerId
        )
      ) {
        grupo.primeraVenta = fecha;
        grupo.primerId = venta.id;
      }
    }

    const ordenados = [...grupos.values()].sort(
      (a, b) =>
        b.cantidad - a.cantidad ||
        a.primeraVenta - b.primeraVenta ||
        a.primerId - b.primerId,
    );

    const seleccionados =
      limite === undefined
        ? ordenados
        : ordenados.slice(0, limite);

    return seleccionados.map((grupo, index) => ({
      puesto: index + 1,
      nombre: grupo.nombre,
      variante: grupo.variante,
      cantidad: grupo.cantidad,
      sede: grupo.sede,
      campaign: grupo.campaign
        ? {
            ...grupo.campaign,
            logo_url: grupo.campaign.logo_url
              ? this.normalizeUrl(
                  `${process.env.BASE_URL}/${grupo.campaign.logo_url}`,
                )
              : null,
          }
        : null,
    }));
  }

  // CÁLCULO DEL PERIODO GLOBAL

  private fechaParaBD(fecha: DateTime): Date {
    if (this.fechaGuardadaEnUTC) {
      return fecha.toUTC().toJSDate();
    }

    // Para DATETIME guardado como hora local.
    return fecha
      .setZone('UTC', { keepLocalTime: true })
      .toJSDate();
  }

  private normalizarNombre(nombre: string): string {
    return nombre
      .trim()
      .toUpperCase()
      .normalize('NFD')
      // Elimina acentos y diéresis, conservando la Ñ.
      .replace(/[\u0300\u0301\u0302\u0308]/g, '')
      .normalize('NFC')
      .replace(/\s+/g, ' ');
  }

  // FLYERS

  async flyersPorSede(sedeId: number) {
    this.validarSedeId(sedeId);

    const sede = await this.prisma.sede.findFirst({
      where: { id: sedeId },
      select: {
        id: true,
        nombre: true,
        campaigns: {
          orderBy: {
            campaign_id: 'asc',
          },
          select: {
            campaign: {
              select: {
                id: true,
                nombre: true,
                hex: true,
                logo_url: true,
                asignaciones: {
                  orderBy: [
                    { prioridad: 'asc' },
                    { media_id: 'asc' },
                  ],
                  select: {
                    campaign_id: true,
                    media_id: true,
                    started_at: true,
                    ended_at: true,
                    prioridad: true,
                    media: {
                      select: {
                        id: true,
                        nombre: true,
                        url: true,
                        mimeType: true,
                        durationMs: true,
                        createdAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sede) {
      throw new NotFoundException(
        `No existe sede con ID: ${sedeId}`,
      );
    }

    return {
      id: sede.id,
      nombre: sede.nombre,
      medias: sede.campaigns
        .flatMap(({ campaign }) =>
          campaign.asignaciones.map((asignacion) => ({
            ...asignacion.media,
            asignacion: {
              campaign_id: asignacion.campaign_id,
              media_id: asignacion.media_id,
              started_at: asignacion.started_at,
              ended_at: asignacion.ended_at,
              prioridad: asignacion.prioridad,
            },
            campaign: {
              id: campaign.id,
              nombre: campaign.nombre,
              hex: campaign.hex,
              logo_url: campaign.logo_url
                ? this.normalizeUrl(
                    `${process.env.BASE_URL}/${campaign.logo_url}`,
                  )
                : null,
            },
          })),
        )
        .sort(
          (a, b) =>
            a.asignacion.prioridad - b.asignacion.prioridad ||
            a.id - b.id ||
            a.campaign.id - b.campaign.id,
        ),
    };
  }
}