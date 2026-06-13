import { Controller, Get, Post, Body, Patch, Param, Delete, Put, ParseIntPipe } from '@nestjs/common';
import { SedeService } from './sede.service';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { AddCaptionDto } from './dto/add-caption.dto';

@Controller('sede')
export class SedeController {
  constructor(private readonly sedeService: SedeService) {}

  @Get()
  getAll() {
    return this.sedeService.getSedes();
  }

  @Post('/create')
  create(
    @Body() dto: CreateSedeDto
  ) {
    return this.sedeService.create(dto);
  }

  @Post('/captions/add')
  addCaptions(
    @Body() dto: AddCaptionDto
  ) {
    return this.sedeService.addCaptionsToSede(dto);
  }

  @Put('/update/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSedeDto
  ) {
    return this.sedeService.update(id, dto);
  }

  @Delete('/delete/:id')
  remove(
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.sedeService.delete(id);
  }
}
