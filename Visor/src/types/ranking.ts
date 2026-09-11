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
  periodo: string;
  hora_inicio: number;
  minuto_inicio: number;
  dia_semana: number;
  dia_mes: number;
  mes_inicio: number;
  fecha_fin: string;
  fecha_ancla: string;
  zona_horaria: string;
  intervalo_dias: number;
}