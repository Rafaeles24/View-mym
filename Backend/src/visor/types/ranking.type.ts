
import { Prisma, Venta } from "@prisma/client";

export type CampaignRanking = Prisma.CampaignGetPayload<{
  select: {
    id: true;
    nombre: true;
    hex: true;
    logo_url: true;
  };
}>;

export type SedeRanking = Prisma.SedeGetPayload<{
  select: {
    id: true;
    nombre: true;
  };
}>;

export type CampaignRankingDetalle = {
  campaign: CampaignRanking;
  cantidad: number;
};

export type GrupoRanking = {
  nombre: string;
  variante: Venta["variante_empleado"];
  cantidad: number;
  sede: SedeRanking | null;
  campaigns: Map<number, CampaignRankingDetalle>;

  primeraVenta: number;
  primerId: number;
};
