export type RankingCountdown = {
  estado: string;
  hora_inicio_actualizacion: string;
  hora_fin_actualizacion: string;
  intervalo_actualizacion: number;

  zona_horaria: string;
  hora_servidor: string;

  ultima_actualizacion: string | null;
  proxima_actualizacion: string | null;

  segundos_restantes: number | null;
  minutos_restantes: number | null;
  cuenta_regresiva: string | null;
};