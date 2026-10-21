import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { GATEWAY_CONFIG } from "../config/gateway.config";
import { Server } from "socket.io";
import { VersusConfigSync } from "src/versus-config/types/versus-config-sync.type";

@WebSocketGateway(GATEWAY_CONFIG)
export class VersusGateway {
  @WebSocketServer()
  private server!: Server;

  emitVersusRefresh(): void {
    this.server.emit('versus:refresh', {
      timestamp: new Date().toISOString(),
    });

    console.log('[VERSUS GATEWAY] Emitiendo evento de actualización de versus a todos los clientes conectados');
  }

  emitSyncConfigVersusEvent(
    schedule: VersusConfigSync
  ): void {
    this.server.emit('versus-config:sync', schedule);
  }

}