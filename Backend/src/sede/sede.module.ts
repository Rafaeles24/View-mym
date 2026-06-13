import { Module } from '@nestjs/common';
import { SedeService } from './sede.service';
import { SedeController } from './sede.controller';
import { RealTimeModule } from 'src/realtime/realtime.module';

@Module({
  imports: [RealTimeModule],
  controllers: [SedeController],
  providers: [SedeService],
})
export class SedeModule {}
