import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CerradorService } from './cerrador.service';
import { CreateCerradorDto } from './dto/create.dto';

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
}
