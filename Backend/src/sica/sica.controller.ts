import { Controller, Post } from '@nestjs/common';
import { SicaService } from './sica.service';

@Controller('sica')
export class SicaController {
  constructor(
    private readonly sicaService: SicaService,
  ) {}

  @Post('sync')
  sincronizar() {
    return this.sicaService.sincronizar();
  }
}
