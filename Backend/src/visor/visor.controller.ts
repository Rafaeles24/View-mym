import { Controller, Get, Param } from '@nestjs/common';
import { VisorService } from './visor.service';

@Controller('visor')
export class VisorController {
  constructor(private readonly visorService: VisorService) {}

  @Get('all/:id')
  getAllData(
    @Param('id') id: number
  ) {
    return this.visorService.getAllData(id);
  }

}
