import { Module } from '@nestjs/common';
import { ConfigRankingModule } from 'src/config-ranking/config-ranking.module';
import { SedeVersusConfigController } from './sede-versus-config.controller';
import { SedeVersusConfigService } from './sede-versus-config.service';

@Module({
  imports: [ConfigRankingModule],
  controllers: [SedeVersusConfigController],
  providers: [SedeVersusConfigService],
  exports: [SedeVersusConfigService],
})
export class SedeVersusConfigModule {}
