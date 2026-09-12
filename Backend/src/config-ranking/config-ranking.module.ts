import { Module } from '@nestjs/common';
import { ConfigRankingService } from './config-ranking.service';
import { ConfigRankingController } from './config-ranking.controller';

@Module({
  controllers: [ConfigRankingController],
  providers: [ConfigRankingService],
  exports: [ConfigRankingService]
})
export class ConfigRankingModule {}
