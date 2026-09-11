import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { CampaignModule } from './campaign/campaign.module';
import { FilesService } from './files/files.service';
import { FilesModule } from './files/files.module';
import { TimeModule } from './time/time.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleModule1 } from './schedule/schedule.module';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './usuario/usuario.module';
import { SedeModule } from './sede/sede.module';
import { VisorModule } from './visor/visor.module';
import { MediaModule } from './media/media.module';
import { CaptionModule } from './caption/caption.module';
import { OptimizeService } from './optimize/optimize.service';
import { SicaModule } from './sica/sica.module';
import { ConfigRankingModule } from './config-ranking/config-ranking.module';

@Module({
  imports: [PrismaModule, CampaignModule, FilesModule, ScheduleModule.forRoot(), ScheduleModule1, TimeModule, AuthModule, UsuarioModule, SedeModule, VisorModule, MediaModule, CaptionModule, SicaModule, ConfigRankingModule],
  controllers: [AppController],
  providers: [AppService, RealtimeGateway, FilesService, OptimizeService],
})
export class AppModule {}
