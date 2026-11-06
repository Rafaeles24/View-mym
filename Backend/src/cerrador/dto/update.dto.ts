import { IsBoolean, IsOptional, IsString, Max, MaxLength, MinLength } from "class-validator";

export class UpdateCerradorDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nombre_normalizado?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean
}