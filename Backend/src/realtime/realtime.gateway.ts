import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { RankingCountdown } from './types/ranking-countdown.type';
import { RankingConfigSync } from './types/ranking-config.type';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
  allowUpgrades: false,
  pingInterval: 25000,
  pingTimeout: 60000,
})

export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

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

  emitSyncCampaign(
    campaignId: number
  ) {
    this.server
      .to(`room:campaign-${campaignId}`)
      .emit(`campaign:sync`);
  }

  //SEDE
  @SubscribeMessage('sede:join')
  async joinSede(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    data: {
      sedeId: number;
    }
  ) {
    await client.join(`sede:${data.sedeId}`);

    return {
      event: 'sede:joined',
      data: {
        sedeId: data.sedeId,
        room: `sede:${data.sedeId}`
      },
    }
  }

  @SubscribeMessage('sede:leave')
  async leaveSede(
    @ConnectedSocket()
    client: Socket,

    @MessageBody()
    data: {
      sedeId: number;
    }
  ) {
    await client.leave(`sede:${data.sedeId}`);
  }

  emitSyncSede(
    sedeId: number
  ) {
    this.server.to(`sede:${sedeId}`).emit(`sede:refresh`, { sedeId, timestamp: new Date().toISOString(), });
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
  //---------------------------

  //EVENTO DE RANKING
  @SubscribeMessage('join-ranking')
  handleJoinRanking(
    @ConnectedSocket() socket: Socket
  ) {
    socket.join('room:ranking');

    console.log(
      `[SOCKET] ${socket.id} entró a room:ranking`
    );
  }

  @SubscribeMessage('leave-ranking')
  handleLeaveRanking(
    @ConnectedSocket() socket: Socket
  ) {
    socket.leave('room:ranking');
    
    console.log(
      `[SOCKET] ${socket.id} salió de room:ranking`
    );
  }

  emitRankingRefresh() {
    this.server.to("room:ranking")
      .emit(`ranking:refresh`, {
        timestamp: new Date().toISOString(),
      });
  }

  emitSyncConfigRankingEvent(
    schedule: RankingConfigSync
  ) {
    console.log(
      "[SOCKET] emitiendo ranking-config:sync",
      schedule
    );

    this.server
      .to("room:ranking")
      .emit("ranking-config:sync", schedule);
  }
  
  //La hora en tiempo real
  emitCurrentTime() {
    this.server.emit('time:sync', { 
      utc: new Date().toISOString()
    });
  }

  @SubscribeMessage('countdown')
  emitRankingCountdown(data: RankingCountdown): void {
    this.server.emit('ranking:countdown', data);
  }
}
