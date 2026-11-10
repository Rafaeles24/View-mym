import {
  Injectable,
} from '@nestjs/common';

import { VisorSedeService } from './services/visor-sede.service';
import { VisorMediaService } from './services/visor-media.service';
import { VisorRankingService } from './services/visor-ranking.service';
import { VisorSedeStatsDiarioService } from './services/visor-sede-stats-diario.service';
import { VisorTimeService } from './services/visor-time.service';
import { VisorResumenVentasService } from './services/visor-resumen-ventas.service';
import { VisorVersusService } from './services/visor-versus.service';
import { VisorSedeVersusService } from './services/visor-sede-versus.service';


@Injectable()
export class VisorService {

  constructor(
    private readonly visorSede: VisorSedeService,
    private readonly visorRanking: VisorRankingService,
    private readonly visorStatsDiarioSede: VisorSedeStatsDiarioService,
    private readonly visorMedia: VisorMediaService,
    private readonly visorTime: VisorTimeService,
    private readonly visorResumenVentas: VisorResumenVentasService,
    private readonly visorVersus: VisorVersusService,
    private readonly visorSedeVersus: VisorSedeVersusService,
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
      visorResumenMensual,
      visorVersus,
      visorSedeVersus,
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
      this.visorResumenVentas.obtenerResumenMensual('2026-10-01'),
      this.visorVersus.obtenerVersusActivosGlobales(),
      this.visorSedeVersus.obtenerVersusSedes(),
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
      visorResumenMensual,
      visorVersus,
      visorSedeVersus,
      versusRango,
      time: this.visorTime.getCurrentTime(),
    };
  }

  getSedeVersus() {
    return this.visorSedeVersus.obtenerVersusSedes();
  }

}
