import { Controller } from '@nestjs/common';
import { VersusConfigService } from './versus-config.service';

@Controller('versus-config')
export class VersusConfigController {
  constructor(private readonly versusConfigService: VersusConfigService) {}
}
