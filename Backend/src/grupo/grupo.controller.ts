import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GrupoService } from './grupo.service';
import { CreateGrupoDto } from './dto/create.dto';

@Controller('grupo')
export class GrupoController {
  constructor(private readonly grupoService: GrupoService) {}

  @Get('/:id')
  getGrupo(
    @Param('id') id: number
  ) {
    return this.grupoService.getGrupo(id);
  }

  @Post('/create')
  create(
    @Body() dto: CreateGrupoDto
  ) {
    return this.grupoService.create(dto);
  }
}
