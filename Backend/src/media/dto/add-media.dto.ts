import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class AssignMediaToSedesDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  mediaId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(0.001)
  duration?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Sede)
  sedes!: Sede[];
}

class Sede {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  sedeId!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prioridad?: number;

  @IsOptional()
  @IsDateString()
  started_at?: string;

  @IsOptional()
  @IsDateString()
  ended_at?: string;
}