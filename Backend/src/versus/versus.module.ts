import { Module } from '@nestjs/common';
import { VersusService } from './versus.service';
import { VersusController } from './versus.controller';

@Module({
  controllers: [VersusController],
  providers: [VersusService],
})
export class VersusModule {}
