import { Module } from '@nestjs/common';
import { CerradorService } from './cerrador.service';
import { CerradorController } from './cerrador.controller';
import { FilesService } from 'src/files/files.service';

@Module({
  controllers: [CerradorController],
  providers: [CerradorService, FilesService],
})
export class CerradorModule {}
