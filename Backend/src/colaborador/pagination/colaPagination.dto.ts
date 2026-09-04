import {
  Transform,
  Type,
} from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Pagination } from 'src/pagination/pagination.dto';

const ToBoolean = () =>
  Transform(({ value }) => {
    if (
      value === true ||
      value === 'true' ||
      value === '1'
    ) {
      return true;
    }

    if (
      value === false ||
      value === 'false' ||
      value === '0'
    ) {
      return false;
    }

    return value;
  });

export class ColaboradorPagination extends PartialType(
  Pagination,
) {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  supervisor?: boolean;

  @IsOptional()
  @IsIn(['ALTA', 'OJT'])
  variante?: 'ALTA' | 'OJT';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sedeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  campaignId?: number;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}