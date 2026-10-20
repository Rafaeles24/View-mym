export type TipoResumen = "global" | "sede";

export type ResumenVentas = {
  fecha: string;
  zona_horaria: string;
  diferencia_madrid_lima: number;
  horario: Horario;
  global: Global;
  sede: SedeResumen;
}

type Horario = {
  inicio: string;
  fin: string;
}

type Global = {
  totales: Totales;
  tramos: Tramo[];
}

type Totales = {
  ventas: number;
  ventas_en_tramos: number;
  ventas_fuera_de_horario: number;
  ventas_sin_fecha_lima: number;
}

type Tramo = {
  clave: string;
  hora_inicio: string;
  hora_fin: string;
  cantidad: number;
  porcentaje: number;
}

type SedeResumen = {
  sede_id: number;
  nombre: string;
  totales: Totales;
  tramos: Tramo[];
}

export type EstadoTramo =
  | "FINALIZADO"
  | "EN CURSO"
  | "SIN DEFINIR";