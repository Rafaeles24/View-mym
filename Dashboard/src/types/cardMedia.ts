import { Pagination } from "./pagination";

export type PaginationMedia = Pagination & {
    data: MediaType[]
}

export type MediaType = {
    id: number;
    url: string;
    mimetype: string;
    duration: string;
    createdat: string;
    campanias: CampaniaMedia[];
}

export type CampaniaMedia = {
    id: number;
    nombre: string;
    url: string;
    hex: string;
    prioridad?: number;
}