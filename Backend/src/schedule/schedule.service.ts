import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';

@Injectable()
export class ScheduleService {
    constructor(
        private readonly rt: RealtimeGateway,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    emitCurrentTime() {
        this.rt.emitCurrentTime();
    }

    @Cron(CronExpression.EVERY_12_HOURS)
    emitSyncRanking() {
        this.rt.emitRankingEvent("refresh");
    }

}