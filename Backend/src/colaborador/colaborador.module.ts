import { Module } from '@nestjs/common';
import { ColaboradorService } from './colaborador.service';
import { ColaboradorController } from './colaborador.controller';
import { FilesModule } from 'src/files/files.module';

@Module({
  controllers: [ColaboradorController],
  providers: [ColaboradorService],
  imports: [FilesModule]
})
export class ColaboradorModule {}
