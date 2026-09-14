import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';

import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';
import { SicaService } from 'src/sica/sica.service';
import { ConfigRankingService } from
  'src/config-ranking/config-ranking.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
    private readonly sicaService: SicaService,
    private readonly configRankingService: ConfigRankingService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  emitCurrentTime() {
    this.rt.emitCurrentTime();
  }

  @Cron('0 * * * * *', {
    timeZone: 'America/Lima',
    waitForCompletion: true,
  })
  async renovarRangoRanking() {
    try {
      await this.configRankingService.renovarSiCorresponde();
    } catch (error: unknown) {
      this.logger.error(
        'No se pudo renovar el rango del ranking',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @Cron('* * * * * *', {
    timeZone: 'America/Lima',
    waitForCompletion: true,
  })
  async revisarActualizacionRanking() {
    try {
      const config =
        await this.configRankingService.obtenerProgramacion();

      if (!config.proxima_actualizacion) {
        return;
      }

      const ahora = DateTime.now().setZone(
        config.zona_horaria,
      );

      const programada = DateTime.fromJSDate(
        config.proxima_actualizacion,
        { zone: config.zona_horaria },
      );

      if (ahora.toMillis() < programada.toMillis()) {
        return;
      }

      const puntoValido =
        this.configRankingService.siguienteActualizacionRanking(
          programada,
          config,
          true,
        );

      const perteneceAlHorario =
        puntoValido.toMillis() === programada.toMillis();

      const retrasoMs =
        ahora.toMillis() - programada.toMillis();

      const debeEjecutar =
        perteneceAlHorario &&
        retrasoMs < 60_000;

      const proxima =
        this.configRankingService.siguienteActualizacionRanking(
          ahora,
          config,
        );

      const reservado =
        await this.prisma.configRanking.updateMany({
          where: {
            id: config.id,
            proxima_actualizacion:
              config.proxima_actualizacion,
            hora_inicio_actualizacion:
              config.hora_inicio_actualizacion,
            hora_fin_actualizacion:
              config.hora_fin_actualizacion,
            intervalo_actualizacion:
              config.intervalo_actualizacion,
            zona_horaria: config.zona_horaria,
          },
          data: {
            proxima_actualizacion:
              proxima.toUTC().toJSDate(),
          },
        });

      if (reservado.count === 0) {
        return;
      }

      if (!debeEjecutar) {
        this.rt.emitSyncConfigRankingEvent('sync');
        return;
      }

      this.logger.log(
        `Iniciando batch programado para ${programada.toISO()}`,
      );

      await this.sicaService.sincronizar();

      await this.prisma.configRanking.update({
        where: { id: config.id },
        data: {
          ultima_actualizacion: new Date(),
        },
      });

      this.rt.emitSyncConfigRankingEvent('sync');

      this.logger.log('Batch del ranking completado');
    } catch (error: unknown) {

      this.rt.emitSyncConfigRankingEvent('sync');

      this.logger.error(
        'Falló la actualización del ranking',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @Cron('* * * * * *', {
    timeZone: 'America/Lima',
    waitForCompletion: true,
  })
  async emitirCuentaRegresivaRanking() {
    try {
      const cuentaRegresiva =
        await this.configRankingService.obtenerCuentaRegresiva();

      this.rt.emitRankingCountdown(cuentaRegresiva);
    } catch (error: unknown) {
      this.logger.error(
        'No se pudo emitir la cuenta regresiva del ranking',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}