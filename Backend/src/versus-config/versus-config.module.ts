import { Module } from '@nestjs/common';
import { VersusConfigService } from './versus-config.service';
import { VersusConfigController } from './versus-config.controller';
import { VersusGateway } from 'src/realtime/gateways/versus.gateway';

@Module({
  controllers: [VersusConfigController],
  providers: [VersusConfigService, VersusGateway],
  exports: [VersusConfigService, VersusGateway]
})
export class VersusConfigModule {}
