import { Module } from '@nestjs/common';
import { VersusService } from './versus.service';
import { VersusController } from './versus.controller';
import { VersusConfigModule } from 'src/versus-config/versus-config.module';

@Module({
  imports: [VersusConfigModule],
  controllers: [VersusController],
  providers: [VersusService],
})
export class VersusModule {}
