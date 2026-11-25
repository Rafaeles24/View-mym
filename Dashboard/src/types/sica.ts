export type EstadoReconciliacionSica =
  | "SIN_EJECUCIONES"
  | "EN_PROCESO"
  | "COMPLETADO"
  | "ERROR";

export type OrigenReconciliacionSica = "API" | "CRON";

export type MetricasSica = {
  ventasSicaProcesadas: number;
  registrosVentasProcesadas: number;
  ventaCerradorNoRegistrado: number;
  omitidos: number;
};

export type ResumenReconciliacionSica = MetricasSica & {
  diasConsultados: number;
};

export type SeguimientoReconciliacionSica = {
  id: string | null;
  estado: EstadoReconciliacionSica;
  origen: OrigenReconciliacionSica | null;
  inicio: string | null;
  fin: string | null;
  iniciadoEn: string | null;
  finalizadoEn: string | null;
  diasTotales: number;
  diasCompletados: number;
  fechaActual: string | null;
  resumen: ResumenReconciliacionSica | null;
  error: string | null;
};

export type ResultadoSincronizacionSica = MetricasSica & {
  estado: "ACTUALIZADO" | "SIN_VENTAS";
  mensaje: string;
};

export type InicioReconciliacionSica = {
  id: string;
  estado: "EN_PROCESO";
  inicio: string;
  fin: string;
  consultarEstado: string;
};
