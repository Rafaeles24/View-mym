import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CerradorService } from './cerrador.service';
import { CreateCerradorDto } from './dto/create.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateCerradorDto } from './dto/update.dto';

@Controller('cerrador')
export class CerradorController {
  constructor(private readonly cerradorService: CerradorService) {}

  @Get()
  getCerradores(
    @Query('activos') activo?: string,
  ) {
    if (
      activo !== undefined &&
      activo !== '0' &&
      activo !== '1'
    ) {
      throw new BadRequestException(
        'El parámetro activo debe ser 0 o 1',
      );
    }

    const activos = activo !== '0';

    console.log('activos', activos);

    return this.cerradorService.getCerradores(activos);
  }

  @Get(':id')
  getCerrador(
    @Param('id') id: number
  ) {
    return this.cerradorService.getCerrador(id);
  }

  @Post('/create')
  create(
    @Body() dto: CreateCerradorDto
  ) {
    return this.cerradorService.create(dto);
  }

  @Patch('/update/:id')
  updateCerrador(
    @Param('id') id: number,
    @Body() dto: UpdateCerradorDto
  ) {
    return this.cerradorService.updateCerrador(id, dto);
  }

  @Patch('update-avatar/:id')
  @UseInterceptors(FileInterceptor('file'))
  updateAvatar(
    @Param('id') id: number,
    @UploadedFile() file: Express.Multer.File
  ) {
    const nFile = {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }

    return this.cerradorService.updateAvatar(id, nFile);
  }
}
