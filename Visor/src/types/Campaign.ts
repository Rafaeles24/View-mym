export type Campaign = {
  id: number;
  nombre: string;
  hex: string;
  logoUrl: string;
  sedes: Sede[];
}

export type Sede = {
  id: number;
  nombre: string;
} 

export type FullCampaign = Campaign & {
  medias: Media[];
  captions: Caption[];
  stats: Stat[];
}

export type Media = {
  id: number;
  url: string;
  duration: number;
  mimetype: string;
}

export type Caption = {
  id: number;
  sede: string;
  title: string;
  text: string;
  hex: string;
}

export type Stat = {
  id: number;
  sede: string;
  supervisor: string;
  asesor: string;
  tipoUsuario: string;
  uci: string;
  hex: string;
  nroVentas: number;
  nroVentasSemanal: number;
  fechaInicio: string;
  fechaFin: string;
  nuevo: boolean;
/*   asistio: string; */
}