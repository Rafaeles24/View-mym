import { Venta } from "@prisma/client";

import {
  CampaignRanking,
  SedeRanking,
} from "../types/ranking.type";

export type CampaignRankingResponse =
  Omit<CampaignRanking, "logo_url"> & {
    logo_url: string | null;
    cantidad: number;
  };

export interface FilaRanking {
  puesto: number;
  nombre: string;
  variante: Venta["variante_empleado"];
  cantidad: number;
  sede: SedeRanking | null;

  campaigns: CampaignRankingResponse[];
}