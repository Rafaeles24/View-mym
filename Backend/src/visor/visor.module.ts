import { Module } from '@nestjs/common';
import { VisorService } from './visor.service';
import { VisorController } from './visor.controller';
import { TimeService } from 'src/time/time.service';
import { ConfigRankingModule } from 'src/config-ranking/config-ranking.module';

@Module({
  imports: [ConfigRankingModule],
  controllers: [VisorController],
  providers: [VisorService, TimeService],
})
export class VisorModule {}
