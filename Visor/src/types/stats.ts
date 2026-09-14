export type SedeStats = {
  periodo: string;
  total_ventas: number;
  sedes: SedeStatsDetail[];
}

type SedeStatsDetail = {
  puesto: number;
  sede_id: number;
  sede: string;
  cantidad: number;
}