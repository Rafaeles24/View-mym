import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  ConfigRanking,
  ModoRanking,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';

import type {
  ActualizarConfigRankingInput,
} from './types/ConfigRankingInput.type';
import { RankingCountdown } from 'src/realtime/types/ranking-countdown.type';

@Injectable()
export class ConfigRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

  private readonly configId = 1;
  private readonly zona = 'America/Lima';

  private ahora(): DateTime {
    return DateTime.now().setZone(this.zona);
  }

  private calcularDefault(
    referencia: DateTime,
    siguienteSiEsFinDeSemana: boolean,
  ): {
    fecha_inicio: Date;
    fecha_fin: Date;
  } {

    // Luxon: lunes = 1 ... domingo = 7.
    let lunes = referencia
      .startOf('day')
      .minus({ days: referencia.weekday - 1 });

    if (
      siguienteSiEsFinDeSemana &&
      referencia.weekday >= 6
    ) {
      lunes = lunes.plus({ weeks: 1 });
    }

    const corte = lunes.plus({ days: 5 });

    return {
      fecha_inicio: lunes.toUTC().toJSDate(),
      fecha_fin: corte.toUTC().toJSDate(),
    };
  }

  private async leerOCrear(): Promise<ConfigRanking> {
    const existente =
      await this.prisma.configRanking.findUnique({
        where: { id: this.configId },
      });

    if (existente) {
      return existente;
    }

    // Si se configura por primera vez un fin de semana,
    // se prepara la siguiente semana.
    const rango = this.calcularDefault(this.ahora(), true);

    return this.prisma.configRanking.upsert({
      where: { id: this.configId },
      create: {
        id: this.configId,
        modo: ModoRanking.DEFAULT,
        ...rango,
        zona_horaria: this.zona,
      },
      update: {},
    });
  }

  private notificarCambio(): void {
    this.rt.emitSyncConfigRankingEvent('sync');
    this.rt.emitSyncRankingEvent('refresh');
  }

  /**
   * Se llama desde el cron y desde las consultas del visor.
   * No escribe ni emite eventos si el rango sigue vigente.
   */
  async renovarSiCorresponde(): Promise<ConfigRanking> {
    for (let intento = 0; intento < 5; intento++) {
      const config = await this.leerOCrear();
      const ahora = this.ahora();

      let nuevoRango:
        | {
            fecha_inicio: Date;
            fecha_fin: Date;
          }
        | undefined;

      if (config.modo === ModoRanking.PERSONALIZADO) {
        const vencido =
          ahora.toMillis() >= config.fecha_fin.getTime();

        if (!vencido) {
          return config;
        }

        // Lunes–viernes: semana actual.
        // Sábado–domingo: siguiente semana.
        nuevoRango = this.calcularDefault(ahora, true);
      } else {
        const inicioGuardado = DateTime.fromJSDate(
          config.fecha_inicio,
          { zone: this.zona },
        );

        // El DEFAULT se renueva el lunes siguiente,
        // no al terminar el viernes.
        const siguienteLunes = inicioGuardado
          .startOf('day')
          .minus({ days: inicioGuardado.weekday - 1 })
          .plus({ weeks: 1 });

        if (ahora.toMillis() < siguienteLunes.toMillis()) {
          return config;
        }

        // Recupera también renovaciones omitidas por apagado.
        nuevoRango = this.calcularDefault(ahora, false);
      }

      const resultado =
        await this.prisma.configRanking.updateMany({
          where: {
            id: this.configId,
            modo: config.modo,
            fecha_inicio: config.fecha_inicio,
            fecha_fin: config.fecha_fin,
            zona_horaria: config.zona_horaria,
            updateAt: config.updateAt,
          },
          data: {
            modo: ModoRanking.DEFAULT,
            ...nuevoRango,
            zona_horaria: this.zona,
          },
        });

      if (resultado.count === 1) {
        this.notificarCambio();
      }

    }

    throw new ConflictException(
      'La configuración cambió simultáneamente. Reintenta la consulta.',
    );
  }

  async obtener() {
    const config = await this.renovarSiCorresponde();

    return this.crearRespuesta(config);
  }

  /**
   * Devuelve DateTime para conservar fechaParaBD()
   * en el VisorService que ya tienes.
   */
  async obtenerRangoVigente() {
    const config = await this.renovarSiCorresponde();

    return {
      config,
      inicio: DateTime.fromJSDate(config.fecha_inicio, {
        zone: this.zona,
      }),
      fin: DateTime.fromJSDate(config.fecha_fin, {
        zone: this.zona,
      }),
    };
  }

  async actualizar(input: ActualizarConfigRankingInput) {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input)
    ) {
      throw new BadRequestException(
        'Debes enviar fecha_inicio y fecha_fin',
      );
    }

    const inicio = this.convertirFechaLocal(
      input.fecha_inicio,
      'fecha_inicio',
    );

    const ultimoMinuto = this.convertirFechaLocal(
      input.fecha_fin,
      'fecha_fin',
    );

    const corte = ultimoMinuto.plus({ minutes: 1 });

    if (
      !corte.isValid ||
      corte.year > 9999 ||
      corte.toMillis() <= inicio.toMillis()
    ) {
      throw new BadRequestException(
        'El rango de fechas no es válido',
      );
    }

    if (corte.toMillis() <= this.ahora().toMillis()) {
      throw new BadRequestException(
        'El rango personalizado ya terminó',
      );
    }

    const datos = {
      modo: ModoRanking.PERSONALIZADO,
      fecha_inicio: inicio.toUTC().toJSDate(),
      fecha_fin: corte.toUTC().toJSDate(),
      zona_horaria: this.zona,
    };

    const config = await this.prisma.configRanking.upsert({
      where: { id: this.configId },
      create: {
        id: this.configId,
        ...datos,
      },
      update: datos,
    });

    this.notificarCambio();

    return this.crearRespuesta(config);
  }

  private convertirFechaLocal(
    valor: string,
    campo: string,
  ): DateTime {
    if (
      typeof valor !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)
    ) {
      throw new BadRequestException(
        `${campo} debe tener formato YYYY-MM-DDTHH:mm`,
      );
    }

    const fecha = DateTime.fromISO(valor, {
      zone: this.zona,
    });

    if (
      !fecha.isValid ||
      fecha.year < 1000 ||
      fecha.year > 9999 ||
      fecha.toFormat("yyyy-MM-dd'T'HH:mm") !== valor
    ) {
      throw new BadRequestException(
        `${campo} no es una fecha válida`,
      );
    }

    return fecha;
  }

  private crearRespuesta(config: ConfigRanking) {
    const inicio = DateTime.fromJSDate(config.fecha_inicio, {
      zone: this.zona,
    });

    const corte = DateTime.fromJSDate(config.fecha_fin, {
      zone: this.zona,
    });

    return {
      id: config.id,
      modo: config.modo,
    
      fecha_inicio: inicio.toISO(),
      fecha_fin: corte.minus({ milliseconds: 1 }).toISO(),
      fecha_corte: corte.toISO(),
    
      zona_horaria: config.zona_horaria,
    
      hora_inicio_actualizacion:
        config.hora_inicio_actualizacion,
    
      hora_fin_actualizacion:
        config.hora_fin_actualizacion,
    
      intervalo_actualizacion:
        config.intervalo_actualizacion,
    
      ultima_actualizacion:
        config.ultima_actualizacion?.toISOString() ?? null,
    
      proxima_actualizacion:
        config.proxima_actualizacion?.toISOString() ?? null,
    
      updateAt: config.updateAt,
    };
  }

  private validarProgramacion(config: {
    hora_inicio_actualizacion: string;
    hora_fin_actualizacion: string;
    intervalo_actualizacion: number;
  }): void {
    const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
      typeof config.hora_inicio_actualizacion !== 'string' ||
      !formatoHora.test(config.hora_inicio_actualizacion) ||
      typeof config.hora_fin_actualizacion !== 'string' ||
      !formatoHora.test(config.hora_fin_actualizacion)
    ) {
      throw new BadRequestException(
        'Las horas deben tener formato HH:mm',
      );
    }

    // Comparación válida para horas con formato HH:mm.
    if (
      config.hora_inicio_actualizacion >=
      config.hora_fin_actualizacion
    ) {
      throw new BadRequestException(
        'La hora final debe ser posterior a la hora inicial',
      );
    }

    if (
      !Number.isInteger(config.intervalo_actualizacion) ||
      config.intervalo_actualizacion < 1 ||
      config.intervalo_actualizacion > 1440
    ) {
      throw new BadRequestException(
        'intervalo_actualizacion debe ser un entero entre 1 y 1440 minutos',
      );
    }
  }

  /**
   * Calcula el siguiente punto de la secuencia diaria:
   * apertura + múltiplos del intervalo + cierre obligatorio.
   *
   * incluirReferencia:
   * true  -> permite devolver el instante consultado.
   * false -> devuelve un instante estrictamente posterior.
   */
  siguienteActualizacionRanking(
    referencia: DateTime,
    config: Pick<
      ConfigRanking,
      | 'hora_inicio_actualizacion'
      | 'hora_fin_actualizacion'
      | 'intervalo_actualizacion'
      | 'zona_horaria'
    >,
    incluirReferencia = false,
  ): DateTime {
    this.validarProgramacion(config);

    const local = referencia.setZone(config.zona_horaria);

    if (!local.isValid) {
      throw new BadRequestException(
        'La fecha o zona horaria de programación no es válida',
      );
    }

    const [horaInicio, minutoInicio] =
      config.hora_inicio_actualizacion.split(':').map(Number);

    const [horaFin, minutoFin] =
      config.hora_fin_actualizacion.split(':').map(Number);

    const intervaloMs =
      config.intervalo_actualizacion * 60_000;

    const referenciaMs = local.toMillis();

    let dia = local.startOf('day');

    // Como máximo se necesita llegar al próximo día laborable.
    for (let intento = 0; intento < 8; intento++) {
      if (dia.weekday <= 5) {
        const apertura = dia.set({
          hour: horaInicio,
          minute: minutoInicio,
          second: 0,
          millisecond: 0,
        });

        const cierre = dia.set({
          hour: horaFin,
          minute: minutoFin,
          second: 0,
          millisecond: 0,
        });

        const transcurrido =
          referenciaMs - apertura.toMillis();

        const posicion = Math.max(
          0,
          incluirReferencia
            ? Math.ceil(transcurrido / intervaloMs)
            : Math.floor(transcurrido / intervaloMs) + 1,
        );

        const candidato = apertura.plus({
          milliseconds: posicion * intervaloMs,
        });

        // Si el intervalo sobrepasa el cierre,
        // se utiliza el cierre como último batch.
        const siguiente =
          candidato.toMillis() <= cierre.toMillis()
            ? candidato
            : cierre;

        const valido = incluirReferencia
          ? siguiente.toMillis() >= referenciaMs
          : siguiente.toMillis() > referenciaMs;

        if (valido) {
          return siguiente;
        }
      }

      dia = dia.plus({ days: 1 }).startOf('day');
    }

    throw new BadRequestException(
      'No se pudo calcular la siguiente actualización',
    );
  }

  async obtenerProgramacion(): Promise<ConfigRanking> {
    const config = await this.leerOCrear();

    if (config.proxima_actualizacion) {
      return config;
    }

    const proxima = this.siguienteActualizacionRanking(
      DateTime.now(),
      config,
      true,
    );

    await this.prisma.configRanking.updateMany({
      where: {
        id: config.id,
        proxima_actualizacion: null,
        hora_inicio_actualizacion:
          config.hora_inicio_actualizacion,
        hora_fin_actualizacion:
          config.hora_fin_actualizacion,
        intervalo_actualizacion:
          config.intervalo_actualizacion,
        zona_horaria: config.zona_horaria,
      },
      data: {
        proxima_actualizacion: proxima.toUTC().toJSDate(),
      },
    });

    return this.prisma.configRanking.findUniqueOrThrow({
      where: { id: config.id },
    });
  }

  async actualizarProgramacion(input: {
    hora_inicio_actualizacion: string;
    hora_fin_actualizacion: string;
    intervalo_actualizacion: number;
  }) {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input)
    ) {
      throw new BadRequestException(
        'Debes enviar las horas y el intervalo de actualización',
      );
    }

    this.validarProgramacion(input);

    const actual = await this.leerOCrear();

    const datos = {
      hora_inicio_actualizacion:
        input.hora_inicio_actualizacion,
      hora_fin_actualizacion:
        input.hora_fin_actualizacion,
      intervalo_actualizacion:
        input.intervalo_actualizacion,
    };

    const proxima = this.siguienteActualizacionRanking(
      DateTime.now(),
      {
        ...datos,
        zona_horaria: actual.zona_horaria,
      },
      true,
    );

    const config = await this.prisma.configRanking.update({
      where: { id: this.configId },
      data: {
        ...datos,
        proxima_actualizacion: proxima.toUTC().toJSDate(),
      },
    });

    this.rt.emitSyncConfigRankingEvent('sync');

    return this.crearRespuesta(config);
  }

  // Mantiene compatibilidad con el endpoint anterior,
  // si todavía lo utilizas para cambiar solo el intervalo.
  async actualizarIntervalo(minutos: number) {
    const actual = await this.leerOCrear();

    return this.actualizarProgramacion({
      hora_inicio_actualizacion:
        actual.hora_inicio_actualizacion,
      hora_fin_actualizacion:
        actual.hora_fin_actualizacion,
      intervalo_actualizacion: minutos,
    });
  }

  async obtenerCuentaRegresiva(): Promise<RankingCountdown> {
    const config = await this.obtenerProgramacion();
    const ahora = DateTime.now();

    const segundosRestantes = config.proxima_actualizacion
      ? Math.max(
          0,
          Math.ceil(
            (
              config.proxima_actualizacion.getTime() -
              ahora.toMillis()
            ) / 1000,
          ),
        )
      : null;

    let cuentaRegresiva: string | null = null;

    if (segundosRestantes !== null) {
      // Minutos totales: también permite contar hasta el lunes.
      const minutos = Math.floor(segundosRestantes / 60);
      const segundos = segundosRestantes % 60;

      cuentaRegresiva =
        `${String(minutos).padStart(2, '0')}:` +
        `${String(segundos).padStart(2, '0')}`;
    }

    return {
      hora_inicio_actualizacion:
        config.hora_inicio_actualizacion,

      hora_fin_actualizacion:
        config.hora_fin_actualizacion,

      intervalo_actualizacion:
        config.intervalo_actualizacion,

      zona_horaria: config.zona_horaria,
      hora_servidor: ahora.toUTC().toJSDate().toISOString(),

      ultima_actualizacion:
        config.ultima_actualizacion?.toISOString() ?? null,

      proxima_actualizacion:
        config.proxima_actualizacion?.toISOString() ?? null,

      segundos_restantes: segundosRestantes,

      // Minutos completos pendientes, redondeados hacia arriba.
      minutos_restantes: segundosRestantes === null
        ? null
        : Math.ceil(segundosRestantes / 60),

      cuenta_regresiva: cuentaRegresiva,
    };
  }
}