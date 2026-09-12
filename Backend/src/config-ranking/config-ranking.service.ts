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
      updateAt: config.updateAt,
    };
  }
}