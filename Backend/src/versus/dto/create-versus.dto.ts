import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class VersusParticipanteDto {
  @IsInt()
  @Min(1)
  cerrador_id!: number;

  @IsInt()
  @Min(1)
  equipo!: number;

  @IsInt()
  @Min(1)
  orden!: number;
}

export class CreateVersusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => VersusParticipanteDto)
  participantes!: VersusParticipanteDto[];

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
