import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
  allowUpgrades: false,
  pingInterval: 25000,
  pingTimeout: 60000,
})

export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  // EVENTOS DE CAMPAÑA
  @SubscribeMessage('join-campaign')
  handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { campaignId } : { campaignId: number }
  ) {
    socket.join(`room:campaign-${campaignId}`);
  }

  @SubscribeMessage('leave-campaign')
  handleLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { campaignId} : { campaignId: number }
  ) {
    socket.leave(`room:campaign-${campaignId}`);
  }

  emitSyncCampaign<T>(
    campaignId: number,
    payload: T
  ) {
    this.server
      .to(`room:campaign-${campaignId}`)
      .emit(`campaign:sync`, payload);
  }

  emitCampaignMediaEvent<T>(
    campaignId: number,
    event: 'media-added' | 'media-removed' | 'media-updated',
    payload: T
  ) {
    this.server
      .to(`room:campaign-${campaignId}`)
      .emit(`campaign:${event}`, payload);
  }

  //EVENTO GLOBAL DE CAMPANA
  emitGlobalCampaignEvent<T>(
    event: 'created' | 'updated' | 'deleted',
    payload: T
  ) {
    this.server.emit(`global:campaign-${event}`, payload);
  }

  //EVENTO GLOBAL DE SEDE
  emitGlobalSedeEvent<T>(
    event: 'create' | 'updated' | 'deleted',
    payload: T
  ) {
    this.server.emit(`global:sede-${event}`, payload);
  }


  //EVENTO DE SEDE
  @SubscribeMessage('join-sede')
  handleJoinSede(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { sedeId }: { sedeId: number }
  ) {
    socket.join(`room:sede-${sedeId}`);
  }
  
  @SubscribeMessage('leave-sede')
  handleLeaveSede(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { sedeId }: { sedeId: number }
  ) {
    socket.leave(`room:sede-${sedeId}`);
  }

  //EVENTO DE CAMPAÑA
  emitCampaignEvent<T>(
    campaignId: number,
    event: 'created' | 'updated' | 'deleted',
    payload: T
  ) {
    this.server
      .to(`room:campaign-${campaignId}`)
      .emit(`campaign:${event}`, payload);
  }
  //--------------------------

  //EVENTO DE MEDIA
  @SubscribeMessage('join-media')
  handleJoinMedia(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { mediaId } : { mediaId: number }
  ) {
    socket.join(`room:media-${mediaId}`);
  }

  @SubscribeMessage('leave-media')
  handleLeaveMedia(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { mediaId } : { mediaId: number }
  ) {
    socket.leave(`room:media-${mediaId}`);
  }

  emitMediaEvent<T>(
    event: 'created' | 'updated' | 'deleted',
    payload: T
  ) {
    this.server.emit(`media:${event}`, payload);
  }
  //--------------------------

  //EVENTO DE CAPTION
  @SubscribeMessage('join-caption')
  handleJoinCaption(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { captionId } : { captionId: number }
  ) {
    socket.join(`room:caption-${captionId}`);
  }

  @SubscribeMessage('leave-caption')
  handleLeaveCaption(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { captionId } : { captionId: number }
  ) {
    socket.leave(`room:caption-${captionId}`);
  }

  emitCaptionEvent<T>(
    event: 'created' | 'updated' | 'deleted',
    payload: T
  ) {
    this.server.emit(`caption:${event}`, payload);
  }

  emitAddCaptionToSedeEvent<T>(
    sedeId: number,
    event: 'added' | 'removed',
    payload: T
  ) {
    this.server
      .to(`room:sede-${sedeId}`)
      .emit(`sede:caption-${event}`, payload);
  }
  
  //La hora en tiempo real
  emitCurrentTime() {
    this.server.emit('time:sync', { 
      utc: new Date().toISOString()
    });
  }
}
