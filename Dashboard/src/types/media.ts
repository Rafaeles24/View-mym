import { Pagination } from "./pagination";

export type PaginationMedia = Pagination & {
  data: MediaType[]
}

export type MediaType = {
  id: number;
  url: string;
  mimetype: string;
  duration: number;
  createdat: string;
  sedes: SedesMedia[];
}

export type SedesMedia = {
  id: number;
  nombre: string;
  prioridad?: number;
  started_at?: string;
  ended_at?: string;
}

export type AssignMediaSede = {
  sedeId: number;
  prioridad?: number;
  started_at?: string | null;
  ended_at?: string | null;
}