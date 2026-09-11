import { FilaRanking } from "../interface/ranking.interface";

export type GrupoRanking = Omit<FilaRanking, 'puesto'> & {
  primeraVenta: number;
  primerId: number;
}