import { Body, Controller, Get, Patch } from '@nestjs/common';
import { VersusConfigService } from './versus-config.service';
import type { ActualizarConfigVersusInput } from './types/config-versus-input.type';
import { ActualizarProgramacionDto } from 'src/config-ranking/dto/programacion.dto';

@Controller('versus-config')
export class VersusConfigController {
  constructor(private readonly versusConfigService: VersusConfigService) {}

  @Get('obtener')
  obtener() {
    return this.versusConfigService.obtener();
  }

  @Patch('update')
  actualizar(
    @Body() dto: ActualizarConfigVersusInput
  ) {
    return this.versusConfigService.actualizar(dto);
  }

  @Patch('programacion')
  actualizarProgramacion(
    @Body() dto: ActualizarProgramacionDto
  ) {
    return this.versusConfigService.actualizarProgramacion(dto);
  }
}
