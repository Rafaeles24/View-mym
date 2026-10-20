import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from 'src/auth/guard/jwtAuthGuard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MediaPagination } from './pagination/mediaPagination.dto';
import { DeleteMediaDto } from './dto/delete-media.dto';
import { AssignMediaToSedesDto } from './dto/add-media.dto';
import { request } from 'express';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  getMedias(
    @Query() dto: MediaPagination
  ) {
    return this.mediaService.getMedias(dto);
  }

  @Post("/create")
  @UseInterceptors(FilesInterceptor(
    'files',
    20,
    {
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
      fileFilter: (
        request,
        file,
        callback,
      ) => {
        const permitidos = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'video/mp4',
        ];

        if (!permitidos.includes(file.mimetype)) {
          return callback( new BadRequestException(`Formato no permitido: ${file.originalname}`), false);
        }

        callback(null, true);
      }
    }
  ))
  create (
    @UploadedFiles() files: Express.Multer.File[]
  ) {

    if (!files || files.length === 0) {
      throw new BadRequestException(`Debes enviar almenos un archivo`);
    }

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
    @Body() dto: DeleteMediaDto
  ) {
    return this.mediaService.delete(dto);
  } 

  @Patch('/sedes/asignar')
  asignarMediaASedes(
    @Body() dto: AssignMediaToSedesDto,
  ) {
    return this.mediaService.asignarMediaASedes(dto);
  }
}
