import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ConfigRankingService } from './config-ranking.service';
import type { ActualizarConfigRankingInput } from './types/ConfigRankingInput.type';
import { ActualizarProgramacionDto } from './dto/programacion.dto';

@Controller('config-ranking')
export class ConfigRankingController {
  constructor(private readonly configRankingService: ConfigRankingService) {}

  @Get('obtener')
  obtener () {
    return this.configRankingService.obtener();
  }

  @Patch('update')
  actualizar(
    @Body() dto: ActualizarConfigRankingInput
  ) {
    return this.configRankingService.actualizar(dto);
  }

  @Patch('programacion')
  actualizarProgramacion(
    @Body() dto: ActualizarProgramacionDto
  ) {
    return this.configRankingService.actualizarProgramacion(dto);
  }
}
