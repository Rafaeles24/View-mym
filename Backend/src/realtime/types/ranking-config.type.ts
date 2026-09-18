export type RankingConfigSync = {
  id: number;
  modo: string;

  fecha_inicio: string;
  fecha_fin: string;
  fecha_corte: string;

  zona_horaria: string;

  hora_inicio_actualizacion: string;
  hora_fin_actualizacion: string;
  intervalo_actualizacion: number;

  ultima_actualizacion: string | null;
  proxima_actualizacion: string | null;

  updateAt: Date;
};