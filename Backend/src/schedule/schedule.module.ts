import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { FilesModule } from 'src/files/files.module';
import { CampaignModule } from 'src/campaign/campaign.module';

@Module({
    imports: [FilesModule, CampaignModule],
    providers: [ScheduleService],
    exports: [ScheduleService],
})
export class ScheduleModule1 {}
