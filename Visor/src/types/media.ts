export type SedeMedia = {
  id: number;
  nombre: string;
  medias: Media[];
}

type Media = {
  id: number;
  url: string;
  prioridad: number;
  inicio: string;
  fin: string;
  mimetype: string;
  duracionms: number;
}