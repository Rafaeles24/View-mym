import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { VersusService } from './versus.service';
import { CreateVersusDto } from './dto/create-versus.dto';
import { UpdateVersusDto } from './dto/update-versus.dto';

@Controller('versus')
export class VersusController {
  constructor(private readonly versusService: VersusService) {}

  @Post('create')
  crear(
    @Body() dto: CreateVersusDto
  ) {
    return this.versusService.crear(dto);
  }

  @Get()
  listar() {
    return this.versusService.listar();
  }

  @Get(':id')
  obtener(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.versusService.obtenerPorId(id);
  }

  @Patch('update/:id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVersusDto,
  ) {
    return this.versusService.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.versusService.eliminar(id);
  }
}
