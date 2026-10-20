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

export type SedeConfig = {
  sedeId: number;
  prioridad: number;
  started_at: string;
  ended_at: string;
};