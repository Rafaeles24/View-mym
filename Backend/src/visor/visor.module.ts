import { Module } from '@nestjs/common';
import { VisorService } from './visor.service';
import { VisorController } from './visor.controller';
import { ConfigRankingModule } from 'src/config-ranking/config-ranking.module';
import { VisorSedeService } from './services/visor-sede.service';
import { VisorRankingService } from './services/visor-ranking.service';
import { VisorSedeStatsDiarioService } from './services/visor-sede-stats-diario.service';
import { VisorMediaService } from './services/visor-media.service';
import { VisorTimeService } from './services/visor-time.service';
import { VisorResumenVentasService } from './services/visor-resumen-ventas.service';
import { VisorVersusService } from './services/visor-versus.service';
import { VersusConfigService } from 'src/versus-config/versus-config.service';

@Module({
  imports: [ConfigRankingModule],
  controllers: [VisorController],
  providers: [VisorService, VisorSedeService, VisorRankingService, VisorSedeStatsDiarioService, VisorMediaService, VisorTimeService, VisorResumenVentasService, VisorVersusService, VersusConfigService],
})
export class VisorModule {}
