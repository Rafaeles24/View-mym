import { SedeMedia } from "./media";
import { RankingList, RankingRangoFecha } from "./ranking";
import { Sede } from "./sede"
import { SedeStats } from "./stats";
import { Time } from "./time";

export type AllSedeData = {
  sede: Sede;
  rankingAgenteSede: RankingList[];
  rankingGlobalAgente: RankingList[];
  rankingGlobalCerrador: RankingList[];
  sedesStatsDiario: SedeStats;
  rankingRango: RankingRangoFecha;
  flyerSede: SedeMedia;
  time: Time;
}