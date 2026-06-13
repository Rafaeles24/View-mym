import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CaptionService } from './caption.service';
import { CreateCaptionDto } from './dto/create-caption.dto';
import { UpdateCaptionDto } from './dto/update-caption.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('caption')
export class CaptionController {
  constructor(private readonly captionService: CaptionService) {}

  @Get()
  findAll() {
    return this.captionService.getCaptions();
  }

  @Post('/create')
  create(
    @Body() createCaptionDto: CreateCaptionDto[]
  ) {
    return this.captionService.create(createCaptionDto);
  }
}
