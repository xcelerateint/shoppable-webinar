import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../common/redis/redis.service';
import { Inject, forwardRef } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  displayName?: string;
  eventId?: string;
}

interface TimelineEventData {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestampMs: number;
  createdAt: Date;
}

interface ChatMessageData {
  id: string;
  content: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    role: string;
  };
  timestampMs: number;
  createdAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/ws',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, AuthenticatedSocket> = new Map();

  constructor(
    private jwtService: JwtService,
    private redis: RedisService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token;
      const eventId = client.handshake.query.event_id as string;

      if (token) {
        const payload = this.jwtService.verify(token as string);
        client.userId = payload.sub;
        client.userRole = payload.role;
        client.displayName = payload.displayName;
      }

      if (eventId) {
        client.eventId = eventId;
        client.join(`event:${eventId}`);

        // Increment viewer count
        const viewerCount = await this.redis.incrementViewerCount(eventId);
        this.broadcastViewerCount(eventId, viewerCount);
      }

      this.connectedClients.set(client.id, client);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      // Allow anonymous connections for public events
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.eventId) {
      const viewerCount = await this.redis.decrementViewerCount(client.eventId);
      this.broadcastViewerCount(client.eventId, viewerCount);
    }
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channels: string[] },
  ) {
    if (!client.eventId) return;

    for (const channel of data.channels) {
      client.join(`event:${client.eventId}:${channel}`);
    }

    return { status: 'subscribed', channels: data.channels };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channels: string[] },
  ) {
    if (!client.eventId) return;

    for (const channel of data.channels) {
      client.leave(`event:${client.eventId}:${channel}`);
    }

    return { status: 'unsubscribed', channels: data.channels };
  }

  @SubscribeMessage('chat_message')
  async handleChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { content: string; idempotencyKey: string },
  ) {
    if (!client.userId || !client.eventId) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = await this.chatService.create(client.eventId, client.userId, {
        content: data.content,
        idempotencyKey: data.idempotencyKey,
      });

      return { status: 'sent', messageId: message.id };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  @SubscribeMessage('state_sync')
  async handleStateSync(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { lastTimelineId?: string; lastChatId?: string },
  ) {
    if (!client.eventId) return;

    const viewerCount = await this.redis.getViewerCount(client.eventId);

    // In a full implementation, we would fetch missed events since lastTimelineId
    return {
      type: 'STATE_SYNC',
      data: {
        viewerCount,
        hostStatus: { isLive: true },
      },
    };
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { type: 'PONG' };
  }

  // Broadcast methods
  broadcastTimelineEvent(eventId: string, event: TimelineEventData) {
    this.server.to(`event:${eventId}`).emit('timeline_event', {
      channel: 'timeline',
      type: 'TIMELINE_EVENT',
      data: event,
    });
  }

  broadcastChatMessage(eventId: string, message: ChatMessageData) {
    this.server.to(`event:${eventId}`).emit('chat_message', {
      channel: 'chat',
      type: 'CHAT_MESSAGE',
      data: message,
    });
  }

  broadcastChatDelete(eventId: string, messageId: string) {
    this.server.to(`event:${eventId}`).emit('chat_delete', {
      channel: 'chat',
      type: 'CHAT_DELETE',
      data: { messageId },
    });
  }

  broadcastChatPin(eventId: string, messageId: string, action: 'pin' | 'unpin', message?: ChatMessageData) {
    this.server.to(`event:${eventId}`).emit('chat_pin', {
      channel: 'chat',
      type: 'CHAT_PIN',
      data: { messageId, action, message },
    });
  }

  broadcastViewerCount(eventId: string, count: number) {
    this.server.to(`event:${eventId}`).emit('viewer_count', {
      channel: 'presence',
      type: 'VIEWER_COUNT',
      data: { count },
    });
  }

  broadcastHostStatus(eventId: string, isLive: boolean, streamHealth?: string) {
    this.server.to(`event:${eventId}`).emit('host_status', {
      channel: 'presence',
      type: 'HOST_STATUS',
      data: { isLive, streamHealth },
    });
  }

  broadcastOrderUpdate(eventId: string, userId: string, order: {
    orderId: string;
    status: string;
    offerId: string;
    amount: number;
    userDisplayName: string;
  }) {
    // Send to host
    this.server.to(`event:${eventId}:orders`).emit('order_update', {
      channel: 'orders',
      type: 'ORDER_UPDATE',
      data: { ...order, userId },
    });

    // Send to the specific user
    const userSockets = Array.from(this.connectedClients.values())
      .filter((s) => s.userId === userId && s.eventId === eventId);

    for (const socket of userSockets) {
      socket.emit('order_update', {
        channel: 'orders',
        type: 'ORDER_UPDATE',
        data: { ...order, userId },
      });
    }
  }
}
