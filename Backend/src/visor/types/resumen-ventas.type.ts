export type TramoBase = {
  clave: string;
  hora_inicio: number;
  hora_fin: number;
};

export type TramoAcumulado = TramoBase & {
  cantidad: number;
};

export type ResumenSedeInterno = {
  sede_id: number | null;
  sede: string;
  total_ventas: number;
  total_en_tramos: number;
  ventas_fuera_de_horario: number;
  ventas_sin_fecha_lima: number;
  tramos: TramoAcumulado[];
};