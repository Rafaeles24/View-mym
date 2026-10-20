import { SedeMedia } from "./media";
import { RankingList, RankingRangoFecha } from "./ranking";
import { ResumenVentas } from "./resumenVenta";
import { Sede } from "./sede"
import { SedeStats } from "./stats";
import { Time } from "./time";
import { VersusRangoFecha, VisorVersus } from "./versus";

export type AllSedeData = {
  sede: Sede;
  rankingAgenteSede: RankingList[];
  rankingGlobalAgente: RankingList[];
  rankingGlobalCerrador: RankingList[];
  sedesStatsDiario: SedeStats;
  rankingRango: RankingRangoFecha;
  versusRango: VersusRangoFecha;
  flyerSede: SedeMedia;
  visorResumenDiario: ResumenVentas;
  visorResumenAyer: ResumenVentas;
  visorVersus: VisorVersus[];
  time: Time;
}