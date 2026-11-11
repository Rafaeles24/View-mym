export type VersusCampaign = {
  id: number;
  nombre: string;
  hex: string | null;
  logo_url: string | null;
  ventas: number;
};

export type VersusSede = {
  id: number;
  nombre: string;
  ventas: number;
};

export type VersusGrupo = {
  id: number;
  nombre: string;
};

export type VersusCerrador = {
  id: number;
  nombre: string;
  avatar_url: string | null;

  grupo: VersusGrupo | null;

  ventas: number;

  primera_venta: string | null;
  equipo: number;
  orden: number;

  campaigns: VersusCampaign[];

  sedes: VersusSede[];
};

export type EstadoVersus =
  | "LIDER"
  | "EMPATE";

export type VersusResultado = {
  estado: EstadoVersus;
  equipo_lider: number | null;
  diferencia: number;
};

export type VersusEquipo = {
  numero: number;
  ventas: number;
  primera_venta: string | null;
  lider: boolean;
  participantes: VersusCerrador[];
};

export type VisorVersus = {
  id: number;
  nombre: string;

  equipos: VersusEquipo[];

  resultado: VersusResultado;
};

export type VersusRangoFecha = {
  id: number;

  modo:
    | "DEFAULT"
    | "PERSONALIZADO";

  fecha_inicio: string;
  fecha_fin: string;
  fecha_corte: string;

  zona_horaria: string;

  hora_inicio_actualizacion:
    string;

  hora_fin_actualizacion:
    string;

  intervalo_actualizacion:
    number;

  ultima_actualizacion:
    | string
    | null;

  proxima_actualizacion:
    | string
    | null;

  updateAt: string;
};

export type VersusCampaignIcon = VersusCerrador["campaigns"][number];
