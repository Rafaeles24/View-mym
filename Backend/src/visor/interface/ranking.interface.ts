import { VarianteEmpleado } from "@prisma/client";

export interface FilaRanking {
  puesto: number;
  nombre: string;
  variante: VarianteEmpleado;
  cantidad: number;
  sede: {
    id: number;
    nombre: string;
  } | null;
  campaign: {
    id: number;
    nombre: string;
    hex: string | null;
    logo_url: string | null;
  } | null;
}