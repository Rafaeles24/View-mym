import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { VisorService } from './visor.service';
import { CreateVisorDto } from './dto/create-visor.dto';
import { UpdateVisorDto } from './dto/update-visor.dto';

@Controller('visor')
export class VisorController {
  constructor(private readonly visorService: VisorService) {}

  @Get()
  getAllCAmpaigns() {
    return this.visorService.getAllCampaigns();
  }

  @Get('/campaign/:campaignId')
  getCampaign(
    @Param("campaignId", ParseIntPipe) campaignId: number,
  ) {
    return this.visorService.getCampaign(campaignId);
  }
}
