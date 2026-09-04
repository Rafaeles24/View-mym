import { Controller, Get, Param, Patch, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ColaboradorService } from './colaborador.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ColaboradorPagination } from './pagination/colaPagination.dto';

@Controller('colaborador')
export class ColaboradorController {
  constructor(private readonly colaboradorService: ColaboradorService) {}

  @Get()
  getColaboradores(
    @Query() dto: ColaboradorPagination
  ) {
    return this.colaboradorService.getColaboradores(dto);
  }

  @Patch('/avatar/update/:id')
  @UseInterceptors(FileInterceptor('file'))
  updateAvatar(
    @Param('id') id: number,
    @UploadedFile() file: Express.Multer.File
  ) {
    const nfile = {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    };
    
    return this.colaboradorService.updateAvatar(id, nfile);
  }
}
