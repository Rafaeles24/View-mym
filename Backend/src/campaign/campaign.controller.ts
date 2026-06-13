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

  @Get()
  findAll() {
    return this.campaignService.findAll();
  }

/*   @Get('full/:id')
  findFullCampaign(
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.campaignService.findAllOne(id);
  }

  @Get('full/dashboard/:id')
  @UseGuards(JwtAuthGuard)
  findFullDashboard(
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.campaignService.findAllOneDashboard(id)
  } */

  @Patch('update/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCampaignDto: UpdateCampaignDto
  ) {
    return this.campaignService.update(id, updateCampaignDto);
  }

  @Post('add/sedes')
  addSede(
    @Body() dto: AddSedeDto
  ) {
    return this.campaignService.addSedesToCampaign(dto);
  }

  @Post('add/medias')
  addMedias(
    @Body() dto: AddMediaDto
  ) {
    return this.campaignService.addMediasToCampaign(dto);
  }

  @Patch('delete/medias')
  deleteMedias(
    @Body() dto: DeleteMediaDto
  ) {
    return this.campaignService.deleteMediasToCampaign(dto);
  }

/*   @Patch('update/full/:id')
  @UseGuards(JwtAuthGuard)
  updateFull(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFullCampaignDto
  ) {
    return this.campaignService.updateFullCampaign(id, dto);
  } */
}
