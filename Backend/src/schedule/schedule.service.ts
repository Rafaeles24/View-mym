import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigRankingService } from 'src/config-ranking/config-ranking.service';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';
import { SicaService } from 'src/sica/sica.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
      private readonly rt: RealtimeGateway,
      private readonly sicaService: SicaService,
      private readonly configRankingService: ConfigRankingService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  emitCurrentTime() {
      this.rt.emitCurrentTime();
  }

  @Cron('0 */15 7-15 * * 1-5', {
    timeZone: 'America/Lima',
    waitForCompletion: true,
  })
  async emitSyncRanking() {
    try {
      await this.sicaService.sincronizar();

      this.logger.log('Datos de SICA Center sincronizados');
    } catch (error: unknown) {
      this.logger.error(
        'Falló la sincronización de SICA Center',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @Cron('0 0 16 * * 1-5', {
    timeZone: 'America/Lima',
    waitForCompletion: true,
  })
  async emitSyncRankingCierre() {
    await this.emitSyncRanking();
  }

  @Cron('0 * * * * *', {
    timeZone: 'America/Lima',
    waitForCompletion: true,
  })
  async renovarRangoRanking() {
    try {
      await this.configRankingService.renovarSiCorresponde();

    } catch (error) {
      this.logger.error(`No se puedo renovar el rango del ranking: ${error instanceof Error ? error.stack : String(error)}`)
    }
  }
}