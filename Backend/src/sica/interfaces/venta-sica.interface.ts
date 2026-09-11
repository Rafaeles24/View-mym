export type VarianteAgente = 'OJT' | 'ALTA';

export interface VentaSica {
  idExterno: string;

  cerrador: string;

  agente: string;

  varianteAgente: VarianteAgente;

  campaign: string;

  sede: string;

  fechaTramitacion: string;

  fechaEdicion: string;
}