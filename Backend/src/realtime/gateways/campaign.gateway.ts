import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from 'socket.io';
import { GATEWAY_CONFIG } from "../config/gateway.config";

type CampaignEvent = 'created' | 'updated' | 'deleted';

@WebSocketGateway(GATEWAY_CONFIG)
export class CampaignGateway {
  @WebSocketServer()
  private server!: Server;

  emitCampaignEvent<T>(
    event: CampaignEvent,
    payload: T
  ): void {
    this.server.emit(`campaign:${event}`, payload);
  }
}