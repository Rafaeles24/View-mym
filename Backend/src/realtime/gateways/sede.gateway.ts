import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { GATEWAY_CONFIG } from "../config/gateway.config";

type SedeEvent = 'created' | 'updated' | 'deleted';

@WebSocketGateway(GATEWAY_CONFIG)
export class SedeGateway {
  @WebSocketServer()
  private server!: Server;

  private room(sedeId: number): string {
    return `room:sede-${sedeId}`;
  }

  @SubscribeMessage('join-sede')
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { sedeId: number }
  ) {
    await socket.join(this.room(data.sedeId));

    return {
      event: 'sede:joined',
      data: {
        sedeId: data.sedeId,
        room: this.room(data.sedeId)
      }
    }
  }

  @SubscribeMessage('leave-sede')
  async handleLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { sedeId: number }
  ) {
    await socket.leave(this.room(data.sedeId));
  }

  emitSyncSede(sedeId: number): void {
    this.server.to(this.room(sedeId)).emit('sede:refresh', {
      sedeId,
      timestamp: new Date().toISOString(),
    });
  }

  emitGlobalSedeEvent<T>(
    event: SedeEvent,
    payload: T
  ): void {
    this.server.emit(`global:sede-${event}`, payload);
  }

  emitMediaAssignmentUpdated(data: {
    mediaId: number;
    sedesid: number[];
    agregadas: number[];
    eliminadas: number[];
  }): void {
    const sedesAffectadas = [
      ...new Set([...data.agregadas, ...data.eliminadas])
    ];

    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    for (const sedeId of sedesAffectadas) {
      this.server.to(this.room(sedeId)).emit('sede:media-updated', payload);
    }
  }
}