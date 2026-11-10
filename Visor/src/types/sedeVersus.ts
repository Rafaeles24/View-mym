export type SedeVersusJefe = {
  id: number;
  nombre: string;
  avatar_url: string | null;
  activo: boolean;
};

export type SedeVersusParticipante = {
  id: number;
  nombre: string;
  jefe_operaciones: SedeVersusJefe | null;
  ventas: number;
  primera_venta: string | null;
  posicion: number;
  lider: boolean;
  diferencia_lider: number;
};

export type SedeVersusResultado = {
  estado: "LIDER" | "EMPATE" | "SIN_PARTICIPANTES";
  lideres_sede_ids: number[];
  ventas_lider: number;
  diferencia_primero_segundo: number;
};

export type VisorSedeVersus = {
  participantes: SedeVersusParticipante[];
  resultado: SedeVersusResultado;
};
