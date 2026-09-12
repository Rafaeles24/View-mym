import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { FilesModule } from 'src/files/files.module';
import { CampaignModule } from 'src/campaign/campaign.module';
import { SicaModule } from 'src/sica/sica.module';
import { ConfigRankingModule } from 'src/config-ranking/config-ranking.module';

@Module({
    imports: [FilesModule, CampaignModule, SicaModule, ConfigRankingModule],
    providers: [ScheduleService],
    exports: [ScheduleService],
})
export class ScheduleModule1 {}
