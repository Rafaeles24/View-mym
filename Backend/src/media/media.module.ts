import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { FilesModule } from 'src/files/files.module';
import { AuthModule } from 'src/auth/auth.module';
import { OptimizeService } from 'src/optimize/optimize.service';

@Module({
  imports: [FilesModule, AuthModule],
  controllers: [MediaController],
  providers: [MediaService, OptimizeService],
})
export class MediaModule {}
