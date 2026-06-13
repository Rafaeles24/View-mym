import { Module } from '@nestjs/common';
import { VisorService } from './visor.service';
import { VisorController } from './visor.controller';
import { TimeService } from 'src/time/time.service';

@Module({
  controllers: [VisorController],
  providers: [VisorService, TimeService],
})
export class VisorModule {}
