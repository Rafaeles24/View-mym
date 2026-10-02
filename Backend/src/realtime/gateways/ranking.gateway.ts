import { ConnectedSocket, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { GATEWAY_CONFIG } from "../config/gateway.config";
import { RankingConfigSync } from "../types/ranking-config.type";
import { RankingCountdown } from "../types/ranking-countdown.type";

@WebSocketGateway(GATEWAY_CONFIG)
export class RankingGateway {
  @WebSocketServer()
  private server!: Server;

  emitRankingRefresh(): void {
    this.server.emit('ranking:refresh', {
      timestamp: new Date().toISOString(),
    });

    console.log('[RANKING GATEWAY] Emitiendo evento de actualización de ranking a todos los clientes conectados');
  }

  emitSyncConfigRankingEvent(
    schedule: RankingConfigSync
  ): void {
    this.server.emit('ranking-config:sync', schedule);
  }

  emitRankingCountdown(
    data: RankingCountdown
  ): void {
    this.server.emit('ranking:countdown', data);
  }
}