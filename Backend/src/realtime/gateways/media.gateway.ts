import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from 'socket.io';
import { GATEWAY_CONFIG } from "../config/gateway.config";

type MediaEvent = 'created' | 'updated' | 'deleted';

export type MediaAssignmentUpdate = {
  mediaId: number;
  sedesid: number[];
  agregadas: number[];
  eliminadas: number[];
  timestamp?: string;
};

@WebSocketGateway(GATEWAY_CONFIG)
export class MediaGateway {
  @WebSocketServer()
  private server!: Server;

  emitMediaEvent<T>(
    event: MediaEvent,
    payload: T
  ): void {
    this.server.emit(`media:${event}`, payload);
  }

  emitAssignmentUpdated(
    payload: MediaAssignmentUpdate
  ): void {
    this.server.emit('media:assignment-updated', payload);
  }
}