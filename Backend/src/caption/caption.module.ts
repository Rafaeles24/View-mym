import { Module } from '@nestjs/common';
import { CaptionService } from './caption.service';
import { CaptionController } from './caption.controller';

@Module({
  controllers: [CaptionController],
  providers: [CaptionService],
})
export class CaptionModule {}
