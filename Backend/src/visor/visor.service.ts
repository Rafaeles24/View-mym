import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  ConfigRanking,
  Periodo,
  Prisma,
  TipoEmpleado,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilaRanking } from './interface/ranking.interface';
import { GrupoRanking } from './types/ranking.type';

@Injectable()
export class VisorService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly fechaGuardadaEnUTC = true;

  private normalizeUrl(url: string): string {
    return url.replace(/\\/g, '/');
  }

  async getSede(sedeId: number) {
    return this.prisma.sede.findFirst({
      where: { id: sedeId },
    });
  }

  private validarSedeId(sedeId: number): void {
    if (!Number.isInteger(sedeId) || sedeId <= 0) {
      throw new BadRequestException(
        'sedeId debe ser un entero positivo',
      );
    }
  }

  private async obtenerPeriodoGlobal() {
    const config = await this.prisma.configRanking.findUnique({
      where: { id: 1 },
    });

    if (!config) {
      throw new NotFoundException(
        'No existe la configuración global del ranking',
      );
    }

    const { inicio, fin } = this.calcularPeriodo(config);

    return { config, inicio, fin };
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
      Periodo.DIARIO,
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
      config.periodo,
      inicio,
      fin,
    );
  }

  private async obtenerEstadisticasPorSede(
    tipoEmpleado: TipoEmpleado,
    periodo: Periodo,
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

  private calcularPeriodo(
    config: ConfigRanking,
    referencia: Date = new Date(),
  ): { inicio: DateTime; fin: DateTime } {
    this.validarConfiguracion(config);

    const ahora = DateTime.fromJSDate(referencia, {
      zone: config.zona_horaria,
    });

    if (!ahora.isValid) {
      throw new InternalServerErrorException(
        'Zona horaria o fecha de referencia inválida',
      );
    }

    const horario = {
      hour: config.hora_inicio,
      minute: config.minuto_inicio,
      second: 0,
      millisecond: 0,
    };

    let inicio: DateTime;
    let fin: DateTime;

    switch (config.periodo) {
      case Periodo.DIARIO: {
        inicio = ahora.startOf('day').set(horario);

        if (inicio.toMillis() > ahora.toMillis()) {
          inicio = inicio.minus({ days: 1 });
        }

        fin = inicio.plus({ days: 1 });
        break;
      }

      case Periodo.SEMANAL: {
        // Configuración: domingo = 0 ... sábado = 6.
        const diaActual = ahora.weekday % 7;

        const diasDesdeInicio =
          (diaActual - config.dia_semana + 7) % 7;

        inicio = ahora
          .startOf('day')
          .minus({ days: diasDesdeInicio })
          .set(horario);

        if (inicio.toMillis() > ahora.toMillis()) {
          inicio = inicio.minus({ weeks: 1 });
        }

        fin = inicio.plus({ weeks: 1 });
        break;
      }

      case Periodo.PERSONALIZADO: {
        const fechaAncla = config.fecha_ancla;
        const dias = config.intervalo_dias;

        if (
          !fechaAncla ||
          dias === null ||
          !Number.isInteger(dias) ||
          dias <= 0
        ) {
          throw new InternalServerErrorException(
            'PERSONALIZADO requiere fecha_ancla e intervalo_dias positivo',
          );
        }

        // @db.Date representa una fecha sin hora.
        // Se interpreta esa fecha en la zona configurada.
        const fechaLocal = fechaAncla
          .toISOString()
          .slice(0, 10);

        const ancla = DateTime.fromISO(fechaLocal, {
          zone: config.zona_horaria,
        }).set(horario);

        if (!ancla.isValid) {
          throw new InternalServerErrorException(
            'La fecha de inicio del periodo es inválida',
          );
        }

        // Antes del primer ciclo, se utiliza el intervalo
        // inicial programado, sin crear ciclos anteriores.
        if (ahora.toMillis() < ancla.toMillis()) {
          inicio = ancla;
          fin = ancla.plus({ days: dias });
          break;
        }

        const diasTranscurridos = ahora
          .startOf('day')
          .diff(ancla.startOf('day'), 'days')
          .days;

        const ciclo = Math.floor(diasTranscurridos / dias);

        inicio = ancla.plus({
          days: ciclo * dias,
        });

        // En el día del corte, antes de la hora configurada,
        // todavía corresponde el ciclo anterior.
        if (inicio.toMillis() > ahora.toMillis()) {
          inicio = inicio.minus({ days: dias });
        }

        fin = inicio.plus({ days: dias });
        break;
      }

      case Periodo.MENSUAL: {
        let mesBase = ahora.startOf('month');

        inicio = mesBase.set({
          day: config.dia_mes,
          ...horario,
        });

        if (inicio.toMillis() > ahora.toMillis()) {
          mesBase = mesBase.minus({ months: 1 });

          inicio = mesBase.set({
            day: config.dia_mes,
            ...horario,
          });
        }

        fin = mesBase.plus({ months: 1 }).set({
          day: config.dia_mes,
          ...horario,
        });

        break;
      }

      case Periodo.ANUAL: {
        let anioBase = ahora.startOf('year');

        inicio = anioBase.set({
          month: config.mes_inicio,
          day: config.dia_mes,
          ...horario,
        });

        if (inicio.toMillis() > ahora.toMillis()) {
          anioBase = anioBase.minus({ years: 1 });

          inicio = anioBase.set({
            month: config.mes_inicio,
            day: config.dia_mes,
            ...horario,
          });
        }

        fin = anioBase.plus({ years: 1 }).set({
          month: config.mes_inicio,
          day: config.dia_mes,
          ...horario,
        });

        break;
      }

      default:
        throw new InternalServerErrorException(
          'Periodo de ranking no válido',
        );
    }

    if (
      !inicio.isValid ||
      !fin.isValid ||
      fin.toMillis() <= inicio.toMillis()
    ) {
      throw new InternalServerErrorException(
        'No se pudo calcular el periodo del ranking',
      );
    }

    return { inicio, fin };
  }

  private validarConfiguracion(config: ConfigRanking): void {
    const validarEntero = (
      campo: string,
      valor: number,
      minimo: number,
      maximo: number,
    ) => {
      if (
        !Number.isInteger(valor) ||
        valor < minimo ||
        valor > maximo
      ) {
        throw new InternalServerErrorException(
          `Configuración inválida: ${campo} debe estar entre ` +
          `${minimo} y ${maximo}`,
        );
      }
    };

    validarEntero('hora_inicio', config.hora_inicio, 0, 23);
    validarEntero('minuto_inicio', config.minuto_inicio, 0, 59);

    if (config.periodo === Periodo.SEMANAL) {
      validarEntero('dia_semana', config.dia_semana, 0, 6);
    }

    if (
      config.periodo === Periodo.MENSUAL ||
      config.periodo === Periodo.ANUAL
    ) {
      // Se conserva la regla de 1–28 para evitar
      // fechas inexistentes en algunos meses.
      validarEntero('dia_mes', config.dia_mes, 1, 28);
    }

    if (config.periodo === Periodo.ANUAL) {
      validarEntero('mes_inicio', config.mes_inicio, 1, 12);
    }

    if (config.periodo === Periodo.PERSONALIZADO) {
      if (
        !(config.fecha_ancla instanceof Date) ||
        !Number.isFinite(config.fecha_ancla.getTime())
      ) {
        throw new InternalServerErrorException(
          'Configuración inválida: fecha_ancla es obligatoria y debe ser válida',
        );
      }

      if (config.intervalo_dias === null) {
        throw new InternalServerErrorException(
          'Configuración inválida: intervalo_dias es obligatorio',
        );
      }

      validarEntero(
        'intervalo_dias',
        config.intervalo_dias,
        1,
        2_147_483_647,
      );
    }
  }

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

  // RANGO DE FECHAS DE RANKING

  private readonly configId = 1;

  async obtenerRangoRanking() {
    const config = await this.prisma.configRanking.upsert({
      where: {
        id: this.configId,
      },
      create: {
        id: this.configId,
        periodo: Periodo.SEMANAL,
        hora_inicio: 0,
        minuto_inicio: 0,
        dia_semana: 1,
        dia_mes: 1,
        mes_inicio: 1,
        fecha_ancla: null,
        intervalo_dias: null,
        zona_horaria: 'America/Lima',
      },
      update: {},
    });
  
    let fechaFin: string | null = null;
  
    if (
      config.fecha_ancla &&
      config.intervalo_dias !== null
    ) {
      const fechaLocal = config.fecha_ancla
        .toISOString()
        .slice(0, 10);
    
      fechaFin = DateTime.fromISO(fechaLocal, {
        zone: config.zona_horaria,
      })
        .set({
          hour: config.hora_inicio,
          minute: config.minuto_inicio,
          second: 0,
          millisecond: 0,
        })
        .plus({ days: config.intervalo_dias })
        .toISO();
    }
  
    return {
      ...config,
      fecha_fin: fechaFin,
    };
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