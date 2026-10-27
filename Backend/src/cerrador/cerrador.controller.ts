import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CerradorService } from './cerrador.service';
import { CreateCerradorDto } from './dto/create.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('cerrador')
export class CerradorController {
  constructor(private readonly cerradorService: CerradorService) {}

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
