import { PartialType } from '@nestjs/mapped-types';
import { CreateCampaignDto } from './create-campaign.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class UpdateFullCampaignDto {
    @IsOptional()
    @IsString()
    nombre?: string;
}