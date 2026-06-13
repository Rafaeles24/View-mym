import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { FilesModule } from 'src/files/files.module';
import { TimeModule } from 'src/time/time.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [FilesModule, TimeModule, AuthModule],
  controllers: [CampaignController],
  providers: [CampaignService, JwtStrategy],
  exports: [CampaignService],
})
export class CampaignModule {}
