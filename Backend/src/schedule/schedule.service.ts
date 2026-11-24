
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DateTime } from 'luxon';

import { PrismaService } from 'src/prisma/prisma.service';
import { SicaService } from 'src/sica/sica.service';
import { ConfigRankingService } from 'src/config-ranking/config-ranking.service';
import { SedeGateway } from 'src/realtime/gateways/sede.gateway';
import { TimeGateway } from 'src/realtime/gateways/time.gateway';
import { MediaGateway } from 'src/realtime/gateways/media.gateway';
import { RankingGateway } from 'src/realtime/gateways/ranking.gateway';
import { VersusGateway } from 'src/realtime/gateways/versus.gateway';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  private reconciliacionSemanalEnCurso = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sicaService: SicaService,
    private readonly configRankingService: ConfigRankingService,
    private readonly rankingGateway: RankingGateway,
    private readonly versusGateway: VersusGateway,
    private readonly mediaGateway: MediaGateway,
    private readonly timeGateway: TimeGateway,
    private readonly sedeGateway: SedeGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  emitCurrentTime() {
    this.timeGateway.emitCurrentTime();
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

      if (!config.proxima_actualizacion) return;

      const ahora = DateTime.now().setZone(
        config.zona_horaria,
      );

      const programada = DateTime.fromJSDate(
        config.proxima_actualizacion,
        { zone: config.zona_horaria },
      );

      if (ahora.toMillis() < programada.toMillis()) return;

      const puntoValido =
        this.configRankingService.siguienteActualizacionRanking(
          programada,
          config,
          true,
        );

      const perteneceAlHorario =
        puntoValido.toMillis() === programada.toMillis();

      const retrasoMs = ahora.toMillis() -
        programada.toMillis();

      const debeEjecutar =
        perteneceAlHorario && retrasoMs < 60_000;

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

      if (reservado.count === 0 || !debeEjecutar) return;

      this.configRankingService.establecerEstadoActualizacion(
        'SINCRONIZANDO',
      );

      this.logger.log(
        `Iniciando batch programado para ${programada.toISO()}`,
      );

      try {
        const resultado =
          await this.sicaService.sincronizar(false);

        if (resultado.estado === 'SIN_VENTAS') {
          this.configRankingService.establecerEstadoActualizacion(
            'EN_ESPERA',
          );

          this.logger.warn(
            'Batch omitido: SICA no devolvió ventas.',
          );
          return;
        }

        await this.prisma.configRanking.update({
          where: { id: config.id },
          data: { ultima_actualizacion: new Date() },
        });

        this.configRankingService.establecerEstadoActualizacion(
          'EN_ESPERA',
        );

        this.rankingGateway.emitRankingRefresh();
        this.logger.log('Batch de datos completado.');
      } catch (error) {
        this.configRankingService.establecerEstadoActualizacion(
          'ERROR',
        );
        throw error;
      }
    } catch (error: unknown) {
      this.logger.error(
        'Falló la actualización del ranking',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @Cron('0 0 3 * * 0', {
    name: 'sica-reconciliacion-domingos',
    timeZone: 'America/Lima',
    waitForCompletion: true,
  })
  async reconciliarVentasSicaDomingo(): Promise<void> {
    if (this.reconciliacionSemanalEnCurso) return;

    this.reconciliacionSemanalEnCurso = true;

    try {
      const ultimoDia = DateTime.now()
        .setZone('America/Lima')
        .startOf('day')
        .minus({ days: 1 });

      const primerDia = ultimoDia.minus({ days: 29 });

      const inicio = primerDia.toFormat('dd/MM/yyyy');
      const fin = ultimoDia.toFormat('dd/MM/yyyy');

      this.logger.log(
        `[SICA] Reconciliación dominical ${inicio} - ${fin}`,
      );

      const resultado =
        await this.sicaService.reconciliarPeriodo(
          inicio,
          fin,
          true,
        );

      this.logger.log(
        `[SICA] Reconciliación completada: ` +
        `días=${resultado.diasConsultados}, ` +
        `ventas=${resultado.ventasSicaProcesadas}, ` +
        `registros=${resultado.registrosVentasProcesadas}, ` +
        `omitidos=${resultado.omitidos}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        'Falló la reconciliación dominical de SICA',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.reconciliacionSemanalEnCurso = false;
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

      this.rankingGateway.emitRankingCountdown(cuentaRegresiva);
    } catch (error: unknown) {
      this.logger.error(
        'No se pudo emitir la cuenta regresiva del ranking',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
