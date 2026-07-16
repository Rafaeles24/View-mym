import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { CampaignModule } from './campaign/campaign.module';
import { FilesService } from './files/files.service';
import { FilesModule } from './files/files.module';
import { ScheduleService } from './schedule/schedule.service';
import { TimeModule } from './time/time.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleModule1 } from './schedule/schedule.module';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './usuario/usuario.module';
import { SedeModule } from './sede/sede.module';
import { VisorModule } from './visor/visor.module';
import { MediaModule } from './media/media.module';
import { CaptionModule } from './caption/caption.module';
import { ExcelModule } from './excel/excel.module';
import { OptimizeService } from './optimize/optimize.service';
import { RankingModule } from './ranking/ranking.module';

@Module({
  imports: [PrismaModule, CampaignModule, FilesModule, ScheduleModule.forRoot(), ScheduleModule1, TimeModule, AuthModule, UsuarioModule, SedeModule, VisorModule, MediaModule, CaptionModule, ExcelModule, RankingModule],
  controllers: [AppController],
  providers: [AppService, RealtimeGateway, FilesService, ScheduleService, OptimizeService],
})
export class AppModule {}
