import type { Cerrador } from './cerrador';

export type VersusParticipante = {
  versus_id: number;
  cerrador_id: number;
  equipo: number;
  orden: number;
  cerrador: Cerrador;
};

export type Versus = {
  id: number;
  nombre: string;
  activo: boolean;
  fecha: string | null;
  participantes: VersusParticipante[];
};

export type VersusParticipanteInput = {
  cerrador_id: number;
  equipo: number;
  orden: number;
};

export type VersusInput = {
  nombre: string;
  activo: boolean;
  participantes: VersusParticipanteInput[];
};
