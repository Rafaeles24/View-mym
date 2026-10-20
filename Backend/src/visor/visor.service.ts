import {
  Injectable,
} from '@nestjs/common';

import { ConfigRankingService } from 'src/config-ranking/config-ranking.service';
import { VisorSedeService } from './services/visor-sede.service';
import { VisorMediaService } from './services/visor-media.service';
import { VisorRankingService } from './services/visor-ranking.service';
import { VisorSedeStatsDiarioService } from './services/visor-sede-stats-diario.service';
import { VisorTimeService } from './services/visor-time.service';
import { VisorResumenVentasService } from './services/visor-resumen-ventas.service';
import { DateTime } from 'luxon';
import { VisorVersusService } from './services/visor-versus.service';


@Injectable()
export class VisorService {

  constructor(
    private readonly visorSede: VisorSedeService,
    private readonly visorRanking: VisorRankingService,
    private readonly visorStatsDiarioSede: VisorSedeStatsDiarioService,
    private readonly visorMedia: VisorMediaService,
    private readonly visorTime: VisorTimeService,
    private readonly visorResumenVentas: VisorResumenVentasService,
    private readonly visorVersus: VisorVersusService
  ) {}


  // ============================================================
  // TODA LA DATA EN UNA SOLA PETICIÓN PARA EL FRONTEND
  // ============================================================

  async getAllData(
    sedeId: number,
  ) {
    const [
      sede,
      rankingAgenteSede,
      rankingGlobalAgente,
      rankingGlobalCerrador,
      sedesStatsDiario,
      rankingRango,
      flyerSede,
      visorResumenDiario,
      visorResumenAyer,
      visorVersus,
      versusRango,
    ] = await Promise.all([
      this.visorSede.obtenerSede(sedeId),
      this.visorRanking.leaderboardAgentesPorSede(sedeId),
      this.visorRanking.leaderboardAgentes(),
      this.visorRanking.leaderboardCerradores(),
      this.visorStatsDiarioSede.statDiarioPorSede(),
      this.visorRanking.getRangoFechas(),
      this.visorMedia.obtenerMediaPorSede(sedeId),
      this.visorResumenVentas.obtenerResumenDiario(sedeId),
      this.visorResumenVentas.obtenerResumenAyer(sedeId),
      this.visorVersus.obtenerVersusActivosGlobales(),
      this.visorVersus.getRangoFechas(),
    ]);

    return {
      sede,
      rankingAgenteSede,
      rankingGlobalAgente,
      rankingGlobalCerrador,
      sedesStatsDiario,
      rankingRango,
      flyerSede,
      visorResumenDiario,
      visorResumenAyer,
      visorVersus,
      versusRango,
      time: this.visorTime.getCurrentTime(),
    };
  }

}
