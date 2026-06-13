export type Sede = {
    id: number;
    nombre: string;
    campaigns: campaignSede[];
}

type campaignSede = {
    id: number;
    nombre: string;
    hex: string;
    url: string;
}   