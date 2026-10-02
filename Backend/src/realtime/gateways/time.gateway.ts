import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from 'socket.io';
import { GATEWAY_CONFIG } from "../config/gateway.config";

@WebSocketGateway(GATEWAY_CONFIG)
export class TimeGateway {
  @WebSocketServer()
  private server!: Server;

  emitCurrentTime(): void {
    this.server.emit('time:sync', {
      utc: new Date().toISOString(),
    });
  }
}