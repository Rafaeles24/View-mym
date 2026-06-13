import { Body, Controller, Delete, Get, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from 'src/auth/guard/jwtAuthGuard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MediaPagination } from './pagination/mediaPagination.dto';
import { DeleteMediaDto } from './dto/delete-media.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  /* @UseGuards(JwtAuthGuard) */
  getMedias(
    @Query() dto: MediaPagination
  ) {
    return this.mediaService.getMedias(dto);
  }

  @Post("/create")
  /* @UseGuards(JwtAuthGuard) */
  @UseInterceptors(FilesInterceptor('files'))
  create (
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    const formattedFiles = files.map(file => ({
      buffer: file.buffer,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }));

    return this.mediaService.create(formattedFiles);
  }

  @Delete("/delete")
  delete(
    @Body() dto: DeleteMediaDto[]
  ) {
    return this.mediaService.delete(dto);
  }
}
