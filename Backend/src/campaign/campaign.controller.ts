import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto, UpdateFullCampaignDto } from './dto/update-campaign.dto';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guard/jwtAuthGuard';
import { AddSedeDto } from './dto/add-sede.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { DeleteMediaDto } from './dto/delete-media.dto';

@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post('/create')
 /*  @UseGuards(JwtAuthGuard) */
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createCampaignDto: CreateCampaignDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    const nFile = {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    };

    return this.campaignService.create(createCampaignDto, nFile);
  }

  
}
