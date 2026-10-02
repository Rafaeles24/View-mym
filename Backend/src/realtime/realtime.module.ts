import { Global, Module } from "@nestjs/common";
import { MediaGateway } from "./gateways/media.gateway";
import { RankingGateway } from "./gateways/ranking.gateway";
import { SedeGateway } from "./gateways/sede.gateway";
import { TimeGateway } from './gateways/time.gateway';
import { CampaignGateway } from "./gateways/campaign.gateway";

@Global()
@Module({
    providers: [
      MediaGateway,
      RankingGateway,
      TimeGateway,
      SedeGateway,
      CampaignGateway,
    ],
    exports: [
      MediaGateway,
      RankingGateway,
      TimeGateway,
      SedeGateway,
      CampaignGateway,
    ]
})

export class RealTimeModule {}