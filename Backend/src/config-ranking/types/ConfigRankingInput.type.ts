import { ConfigRanking } from "@prisma/client";

export type ActualizarConfigRankingInput = {
  // EJEM: "2026-09-01T00:00"
  fecha_inicio: string;

  // EJEM: "2026-09-11T23:59"
  fecha_fin: string;
}