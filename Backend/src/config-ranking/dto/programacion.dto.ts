import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class ActualizarProgramacionDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hora_inicio_actualizacion debe tener formato HH:mm',
  })
  hora_inicio_actualizacion!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hora_fin_actualizacion debe tener formato HH:mm',
  })
  hora_fin_actualizacion!: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  intervalo_actualizacion!: number;
}