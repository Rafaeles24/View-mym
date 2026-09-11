import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigRanking, Periodo } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActualizarConfigRankingInput } from './types/ConfigRankingInput.type';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';

@Injectable()
export class ConfigRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway
  ) {}

  private readonly configId = 1;

  async obtener() {
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

  async actualizar(
    input: ActualizarConfigRankingInput,
  ): Promise<ConfigRanking> {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input)
    ) {
      throw new BadRequestException(
        'La configuración debe ser un objeto',
      );
    }

    const actual = await this.obtener();

    // Solo se aceptan campos de configuración.
    // Los undefined conservan el valor actual.
    const siguiente = {
      periodo:
        input.periodo === undefined
          ? actual.periodo
          : input.periodo,

      hora_inicio:
        input.hora_inicio === undefined
          ? actual.hora_inicio
          : input.hora_inicio,

      minuto_inicio:
        input.minuto_inicio === undefined
          ? actual.minuto_inicio
          : input.minuto_inicio,

      dia_semana:
        input.dia_semana === undefined
          ? actual.dia_semana
          : input.dia_semana,

      dia_mes:
        input.dia_mes === undefined
          ? actual.dia_mes
          : input.dia_mes,

      mes_inicio:
        input.mes_inicio === undefined
          ? actual.mes_inicio
          : input.mes_inicio,

      intervalo_dias:
        input.intervalo_dias === undefined
          ? actual.intervalo_dias
          : input.intervalo_dias,

      zona_horaria:
        input.zona_horaria === undefined
          ? actual.zona_horaria
          : input.zona_horaria,

      fecha_ancla:
        input.fecha_ancla === undefined
          ? actual.fecha_ancla
          : this.convertirFechaAncla(input.fecha_ancla),
    };

    this.validarConfiguracion(siguiente);

    this.rt.emitSyncConfigRankingEvent('sync');

    return this.prisma.configRanking.update({
      where: {
        id: this.configId,
      },
      data: siguiente,
    });
  }

  private convertirFechaAncla(
    valor: string | null,
  ): Date | null {
    if (valor === null) {
      return null;
    }

    if (
      typeof valor !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valor)
    ) {
      throw new BadRequestException(
        'fecha_ancla debe tener el formato YYYY-MM-DD',
      );
    }

    // UTC se usa para representar el campo @db.Date.
    // El visor interpreta esta fecha en zona_horaria.
    const fecha = DateTime.fromISO(valor, {
      zone: 'UTC',
    });

    if (
      !fecha.isValid ||
      fecha.toISODate() !== valor ||
      fecha.year < 1000 ||
      fecha.year > 9999
    ) {
      throw new BadRequestException(
        'fecha_ancla debe ser una fecha válida entre los años 1000 y 9999',
      );
    }

    return fecha.startOf('day').toJSDate();
  }

  private validarConfiguracion(
    config: Omit<ConfigRanking, 'id' | 'updateAt'>,
  ): void {
    if (!Object.values(Periodo).includes(config.periodo)) {
      throw new BadRequestException(
        'periodo debe ser DIARIO, SEMANAL, PERSONALIZADO, MENSUAL o ANUAL',
      );
    }

    this.validarEntero(
      'hora_inicio',
      config.hora_inicio,
      0,
      23,
    );

    this.validarEntero(
      'minuto_inicio',
      config.minuto_inicio,
      0,
      59,
    );

    // Domingo = 0, lunes = 1 ... sábado = 6.
    this.validarEntero(
      'dia_semana',
      config.dia_semana,
      0,
      6,
    );

    // Misma regla que utiliza VisorService.
    this.validarEntero(
      'dia_mes',
      config.dia_mes,
      1,
      28,
    );

    this.validarEntero(
      'mes_inicio',
      config.mes_inicio,
      1,
      12,
    );

    if (
      typeof config.zona_horaria !== 'string' ||
      !config.zona_horaria.trim() ||
      !DateTime.now().setZone(config.zona_horaria).isValid
    ) {
      throw new BadRequestException(
        'zona_horaria debe ser válida, por ejemplo America/Lima',
      );
    }

    if (config.intervalo_dias !== null) {
      this.validarEntero(
        'intervalo_dias',
        config.intervalo_dias,
        1,
        2_147_483_647,
      );
    }

    if (
      config.fecha_ancla !== null &&
      (
        !(config.fecha_ancla instanceof Date) ||
        !Number.isFinite(config.fecha_ancla.getTime())
      )
    ) {
      throw new BadRequestException(
        'fecha_ancla no es válida',
      );
    }

    if (config.periodo === Periodo.PERSONALIZADO) {
      if (config.fecha_ancla === null) {
        throw new BadRequestException(
          'fecha_ancla es obligatoria para PERSONALIZADO',
        );
      }

      if (config.intervalo_dias === null) {
        throw new BadRequestException(
          'intervalo_dias es obligatorio para PERSONALIZADO',
        );
      }
    }
  }

  private validarEntero(
    campo: string,
    valor: number,
    minimo: number,
    maximo: number,
  ): void {
    if (
      !Number.isInteger(valor) ||
      valor < minimo ||
      valor > maximo
    ) {
      throw new BadRequestException(
        `${campo} debe ser un entero entre ${minimo} y ${maximo}`,
      );
    }
  }  
  
}
