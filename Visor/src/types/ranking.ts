export type RankingList = {
  puesto: number;
  nombre: string;
  variante: string;
  cantidad: number;
  sede: Sede;
  campaign: campaign;
}

type Sede = {
  id: number;
  nombre: string;
}

type campaign = {
  id: number;
  hex: string | null;
  nombre: string;
  logo_url: string | null;
}

export type RankingRangoFecha = {
  id: number;
  modo: string;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_corte: string;
  zona_horaria: string;
  updateAt: string;
};