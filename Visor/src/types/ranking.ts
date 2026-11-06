
export type RankingList = {
  puesto: number;
  nombre: string;
  variante: string;
  cantidad: number;
  sede: Sede | null;
  campaigns: CampaignRanking[];
};

export type Sede = {
  id: number;
  nombre: string;
};

export type CampaignRanking = {
  id: number;
  hex: string | null;
  nombre: string;
  logo_url: string | null;
  cantidad: number;
};

export type RankingRangoFecha = {
  id: number;
  modo: string;
  fecha_inicio: string;
  fecha_fin: string;
  intervalo_actualizacion: number;
  ultima_actualizacion: string;
  proxima_actualizacion: string;
  hora_inicio_actualizacion: string;
  hora_fin_actualizacion: string;
  zona_horaria: string;
  updateAt: string;
};
