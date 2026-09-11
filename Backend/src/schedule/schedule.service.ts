import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';
import { SicaService } from 'src/sica/sica.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
      private readonly rt: RealtimeGateway,
      private readonly sicaService: SicaService
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
}