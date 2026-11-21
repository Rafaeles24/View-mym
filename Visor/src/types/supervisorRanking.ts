export type SupervisorRankingParticipant = {
  puesto: number;
  id: number;
  nombre: string;
  avatar_url: string | null;
  genero: "M" | "F" | null;
  ventas: number;
  sedes: SupervisorRankingReference[];
  campaigns: SupervisorRankingReference[];
};

export type SupervisorRankingReference = {
  id: number;
  nombre: string;
  cantidad: number;
  logo_url?: string | null;
};

export type SupervisorSalesDay = {
  fecha: string;
  dia: string;
  etiqueta: string;
  semana: string;
  ventas: number;
};

export type SupervisorRankingLeader =
  SupervisorRankingParticipant & {
    mejor_dia: SupervisorSalesDay | null;
    promedio_ventas: number;
    porcentaje_ventas_globales: number;
  };

export type SupervisorLeaderboard = {
  participantes: SupervisorRankingParticipant[];
  destacado: SupervisorRankingLeader | null;
  rango: {
    fecha_inicio: string;
    fecha_fin: string;
    zona_horaria: string;
  };
};
