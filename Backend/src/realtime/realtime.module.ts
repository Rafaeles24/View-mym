import { Global, Module } from "@nestjs/common";
import { MediaGateway } from "./gateways/media.gateway";
import { RankingGateway } from "./gateways/ranking.gateway";
import { SedeGateway } from "./gateways/sede.gateway";
import { TimeGateway } from './gateways/time.gateway';
import { CampaignGateway } from "./gateways/campaign.gateway";
import { VersusGateway } from "./gateways/versus.gateway";

@Global()
@Module({
    providers: [
      MediaGateway,
      RankingGateway,
      TimeGateway,
      SedeGateway,
      CampaignGateway,
      VersusGateway,
    ],
    exports: [
      MediaGateway,
      RankingGateway,
      TimeGateway,
      SedeGateway,
      CampaignGateway,
      VersusGateway,
    ]
})

export class RealTimeModule {}