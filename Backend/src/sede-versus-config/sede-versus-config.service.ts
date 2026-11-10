import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigSedeVersus, ModoRanking } from '@prisma/client';
import { DateTime } from 'luxon';
import { ConfigRankingService } from 'src/config-ranking/config-ranking.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RankingGateway } from 'src/realtime/gateways/ranking.gateway';
import type { ActualizarConfigSedeVersusInput } from './types/config-sede-versus-input.type';

@Injectable()
export class SedeVersusConfigService {
  private readonly configId = 1;
  private readonly zona = 'America/Lima';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configRanking: ConfigRankingService,
    private readonly rankingGateway: RankingGateway,
  ) {}

  private ahora(): DateTime {
    return DateTime.now().setZone(this.zona);
  }

  private fechaLimaParaBD(fecha: DateTime): Date {
    const local = fecha.setZone(this.zona);

    if (!local.isValid) {
      throw new InternalServerErrorException(
        'No se pudo convertir la fecha Lima para la base de datos',
      );
    }

    return local.setZone('UTC', { keepLocalTime: true }).toJSDate();
  }

  private fechaBDALima(fecha: Date): DateTime {
    return DateTime.fromJSDate(fecha, { zone: 'UTC' }).setZone(this.zona, {
      keepLocalTime: true,
    });
  }

  private calcularDefault(
    referencia: DateTime,
    siguienteSiEsFinDeSemana: boolean,
  ): { fecha_inicio: Date; fecha_fin: Date } {
    const referenciaLima = referencia.setZone(this.zona);
    let lunes = referenciaLima
      .startOf('day')
      .minus({ days: referenciaLima.weekday - 1 });

    if (siguienteSiEsFinDeSemana && referenciaLima.weekday >= 6) {
      lunes = lunes.plus({ weeks: 1 });
    }

    return {
      fecha_inicio: this.fechaLimaParaBD(lunes),
      fecha_fin: this.fechaLimaParaBD(lunes.plus({ days: 5 })),
    };
  }

  private async leerOCrear(): Promise<ConfigSedeVersus> {
    const existente = await this.prisma.configSedeVersus.findUnique({
      where: { id: this.configId },
    });

    if (existente) {
      return existente;
    }

    const rango = this.calcularDefault(this.ahora(), true);

    return this.prisma.configSedeVersus.create({
      data: {
        id: this.configId,
        modo: ModoRanking.DEFAULT,
        ...rango,
        zona_horaria: this.zona,
      },
    });
  }

  async renovarSiCorresponde(): Promise<ConfigSedeVersus> {
    for (let intento = 0; intento < 5; intento++) {
      const config = await this.leerOCrear();
      const ahora = this.ahora();
      let nuevoRango: { fecha_inicio: Date; fecha_fin: Date } | undefined;

      if (config.modo === ModoRanking.PERSONALIZADO) {
        if (ahora.toMillis() < this.fechaBDALima(config.fecha_fin).toMillis()) {
          return config;
        }

        nuevoRango = this.calcularDefault(ahora, true);
      } else {
        const inicio = this.fechaBDALima(config.fecha_inicio);
        const siguienteLunes = inicio
          .startOf('day')
          .minus({ days: inicio.weekday - 1 })
          .plus({ weeks: 1 });

        if (ahora.toMillis() < siguienteLunes.toMillis()) {
          return config;
        }

        nuevoRango = this.calcularDefault(ahora, false);
      }

      const actualizado = await this.prisma.configSedeVersus.updateMany({
        where: {
          id: this.configId,
          modo: config.modo,
          fecha_inicio: config.fecha_inicio,
          fecha_fin: config.fecha_fin,
          updatedAt: config.updatedAt,
        },
        data: {
          modo: ModoRanking.DEFAULT,
          ...nuevoRango,
          zona_horaria: this.zona,
        },
      });

      if (actualizado.count === 1) {
        this.rankingGateway.emitRankingRefresh();
        return this.prisma.configSedeVersus.findUniqueOrThrow({
          where: { id: this.configId },
        });
      }
    }

    throw new ConflictException(
      'La configuración cambió simultáneamente. Reintenta la consulta.',
    );
  }

  async obtener() {
    const [config, programacion] = await Promise.all([
      this.renovarSiCorresponde(),
      this.configRanking.obtener(),
    ]);

    return this.crearRespuesta(config, programacion);
  }

  async obtenerRangoVigente() {
    const config = await this.renovarSiCorresponde();

    return {
      config,
      inicio: this.fechaBDALima(config.fecha_inicio),
      fin: this.fechaBDALima(config.fecha_fin),
    };
  }

  async actualizar(input: ActualizarConfigSedeVersusInput) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Debes enviar fecha_inicio y fecha_fin');
    }

    const inicio = this.convertirFechaLocal(input.fecha_inicio, 'fecha_inicio');
    const ultimoMinuto = this.convertirFechaLocal(input.fecha_fin, 'fecha_fin');
    const corte = ultimoMinuto.plus({ minutes: 1 });

    if (
      !corte.isValid ||
      corte.year > 9999 ||
      corte.toMillis() <= inicio.toMillis()
    ) {
      throw new BadRequestException('El rango de fechas no es válido');
    }

    if (corte.toMillis() <= this.ahora().toMillis()) {
      throw new BadRequestException('El rango personalizado ya terminó');
    }

    const config = await this.prisma.configSedeVersus.upsert({
      where: { id: this.configId },
      create: {
        id: this.configId,
        modo: ModoRanking.PERSONALIZADO,
        fecha_inicio: this.fechaLimaParaBD(inicio),
        fecha_fin: this.fechaLimaParaBD(corte),
        zona_horaria: this.zona,
      },
      update: {
        modo: ModoRanking.PERSONALIZADO,
        fecha_inicio: this.fechaLimaParaBD(inicio),
        fecha_fin: this.fechaLimaParaBD(corte),
        zona_horaria: this.zona,
      },
    });

    this.rankingGateway.emitRankingRefresh();

    return this.crearRespuesta(config, await this.configRanking.obtener());
  }

  private convertirFechaLocal(valor: string, campo: string): DateTime {
    if (
      typeof valor !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)
    ) {
      throw new BadRequestException(
        `${campo} debe tener formato YYYY-MM-DDTHH:mm`,
      );
    }

    const fecha = DateTime.fromISO(valor, { zone: this.zona });

    if (
      !fecha.isValid ||
      fecha.year < 1000 ||
      fecha.year > 9999 ||
      fecha.toFormat("yyyy-MM-dd'T'HH:mm") !== valor
    ) {
      throw new BadRequestException(`${campo} no es una fecha válida`);
    }

    return fecha;
  }

  private crearRespuesta(
    config: ConfigSedeVersus,
    programacion: Awaited<ReturnType<ConfigRankingService['obtener']>>,
  ) {
    const inicio = this.fechaBDALima(config.fecha_inicio);
    const corte = this.fechaBDALima(config.fecha_fin);
    const fechaInicio = inicio.toISO();
    const fechaCorte = corte.toISO();
    const fechaFin = corte.minus({ milliseconds: 1 }).toISO();

    if (!fechaInicio || !fechaCorte || !fechaFin) {
      throw new InternalServerErrorException(
        'La configuración del versus de sedes contiene fechas inválidas',
      );
    }

    return {
      ...programacion,
      id: config.id,
      modo: config.modo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      fecha_corte: fechaCorte,
      zona_horaria: config.zona_horaria,
      updateAt: config.updatedAt,
    };
  }
}
