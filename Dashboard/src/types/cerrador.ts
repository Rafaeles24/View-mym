export type Cerrador = {
  id: number;
  nombre: string;
  nombre_normalizado: string;
  avatar_url: string;
  activo: boolean;
}

export type UpdateCerrador = {
  nombre?: string;
  nombre_normalizado?: string;
  activo?: boolean;
}

