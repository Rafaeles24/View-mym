import { Body, Controller, Get, Patch } from '@nestjs/common';
import { SedeVersusConfigService } from './sede-versus-config.service';
import type { ActualizarConfigSedeVersusInput } from './types/config-sede-versus-input.type';

@Controller('sede-versus-config')
export class SedeVersusConfigController {
  constructor(
    private readonly sedeVersusConfigService: SedeVersusConfigService,
  ) {}

  @Get('obtener')
  obtener() {
    return this.sedeVersusConfigService.obtener();
  }

  @Patch('update')
  actualizar(@Body() dto: ActualizarConfigSedeVersusInput) {
    return this.sedeVersusConfigService.actualizar(dto);
  }
}
