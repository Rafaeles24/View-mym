import { ConfigRanking } from "@prisma/client";

export type ActualizarConfigRankingInput = Partial<
  Pick<
    ConfigRanking,
    | 'periodo'
    | 'hora_inicio'
    | 'minuto_inicio'
    | 'dia_semana'
    | 'dia_mes'
    | 'mes_inicio'
    | 'intervalo_dias'
    | 'zona_horaria'
  >  
> & {
  fecha_ancla?: string | null;
}