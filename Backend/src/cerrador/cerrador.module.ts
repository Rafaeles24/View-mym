import { Module } from '@nestjs/common';
import { CerradorService } from './cerrador.service';
import { CerradorController } from './cerrador.controller';

@Module({
  controllers: [CerradorController],
  providers: [CerradorService],
})
export class CerradorModule {}
