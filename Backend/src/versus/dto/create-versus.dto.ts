import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateVersusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsInt()
  @Min(1)
  cerrador_1_id!: number;

  @IsInt()
  @Min(1)
  cerrador_2_id!: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}