export type Ranking = {
    fecha: string;
    hora: string;
    supervisores: SupervisorRanking[];
    agentes: AgenteRanking[];
}

type SupervisorRanking = {
    colaborador_id: number;
    nombre: string;
    puesto: number;
    supervisor: string;
    tramitadas: number;
    campania: CampaniaRanking;
    sede: SedeRanking;
}

export type AgenteRanking = {
    colaborador_id: number;
    nombre: string;
    puesto: number;
    agente: string;
    variante: string;
    campania: CampaniaRanking;
    sede: SedeRanking;
    tramitadas: number;
}

type SedeRanking = {
    id: number;
    nombre: string;
}

type CampaniaRanking = {
    id: number;
    nombre: string;
    logoUrl: string;
    hex: string;
}