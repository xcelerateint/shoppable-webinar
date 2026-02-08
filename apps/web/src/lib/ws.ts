import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

interface WSMessage {
  channel: string;
  type: string;
  data: unknown;
}

type MessageHandler = (message: WSMessage) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private eventId: string | null = null;

  connect(eventId: string, token?: string) {
    if (this.socket?.connected && this.eventId === eventId) {
      return;
    }

    this.disconnect();
    this.eventId = eventId;

    this.socket = io(`${WS_URL}/ws`, {
      auth: { token },
      query: { event_id: eventId },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.socket?.emit('subscribe', { channels: ['timeline', 'chat', 'presence'] });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Handle all event types
    const eventTypes = [
      'timeline_event',
      'chat_message',
      'chat_delete',
      'chat_pin',
      'viewer_count',
      'host_status',
      'order_update',
    ];

    eventTypes.forEach((eventType) => {
      this.socket?.on(eventType, (data: WSMessage) => {
        this.emit(eventType, data);
        this.emit('message', data);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventId = null;
    }
  }

  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: MessageHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: WSMessage) {
    this.handlers.get(event)?.forEach((handler) => handler(data));
  }

  sendChatMessage(content: string, idempotencyKey: string) {
    this.socket?.emit('chat_message', { content, idempotencyKey });
  }

  requestStateSync(lastTimelineId?: string, lastChatId?: string) {
    this.socket?.emit('state_sync', { lastTimelineId, lastChatId });
  }

  ping() {
    this.socket?.emit('ping');
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
