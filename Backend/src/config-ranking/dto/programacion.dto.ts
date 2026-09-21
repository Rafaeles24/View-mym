import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class ActualizarProgramacionDto {
  @IsInt()
  @Min(1)
  @Max(1440)
  intervalo_actualizacion!: number;
}