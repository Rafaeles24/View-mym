import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";
import { Pagination } from "src/pagination/pagination.dto";

export class MediaPagination extends PartialType(Pagination) {

    @IsOptional()
    @IsString()
    mimetype?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    campaignId?: number;

    @IsOptional()
    @IsString()
    startDate?: string;

    @IsOptional()
    @IsString()
    endDate?: string;
}