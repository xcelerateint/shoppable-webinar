import { ChatMessageWithUser } from './chat';
import { ActiveOffer } from './offer';
import { TimelineEvent } from './timeline';

export type WSChannel = 'timeline' | 'chat' | 'presence' | 'orders';

// Client -> Server messages
export type WSClientAction =
  | 'subscribe'
  | 'unsubscribe'
  | 'chat_message'
  | 'state_sync'
  | 'ping';

export interface WSSubscribeMessage {
  action: 'subscribe';
  channels: WSChannel[];
}

export interface WSUnsubscribeMessage {
  action: 'unsubscribe';
  channels: WSChannel[];
}

export interface WSChatMessage {
  action: 'chat_message';
  content: string;
  idempotencyKey: string;
}

export interface WSStateSyncMessage {
  action: 'state_sync';
  lastTimelineId?: string;
  lastChatId?: string;
}

export interface WSPingMessage {
  action: 'ping';
}

export type WSClientMessage =
  | WSSubscribeMessage
  | WSUnsubscribeMessage
  | WSChatMessage
  | WSStateSyncMessage
  | WSPingMessage;

// Server -> Client messages
export type WSServerMessageType =
  | 'TIMELINE_EVENT'
  | 'CHAT_MESSAGE'
  | 'CHAT_DELETE'
  | 'CHAT_PIN'
  | 'VIEWER_COUNT'
  | 'HOST_STATUS'
  | 'ORDER_UPDATE'
  | 'STATE_SYNC'
  | 'ERROR'
  | 'PONG';

export interface WSTimelineEventMessage {
  channel: 'timeline';
  type: 'TIMELINE_EVENT';
  data: TimelineEvent;
}

export interface WSChatMessageResponse {
  channel: 'chat';
  type: 'CHAT_MESSAGE';
  data: ChatMessageWithUser;
}

export interface WSChatDeleteMessage {
  channel: 'chat';
  type: 'CHAT_DELETE';
  data: {
    messageId: string;
  };
}

export interface WSChatPinMessage {
  channel: 'chat';
  type: 'CHAT_PIN';
  data: {
    messageId: string;
    action: 'pin' | 'unpin';
    message?: ChatMessageWithUser;
  };
}

export interface WSViewerCountMessage {
  channel: 'presence';
  type: 'VIEWER_COUNT';
  data: {
    count: number;
  };
}

export interface WSHostStatusMessage {
  channel: 'presence';
  type: 'HOST_STATUS';
  data: {
    isLive: boolean;
    streamHealth?: 'healthy' | 'degraded' | 'offline';
  };
}

export interface WSOrderUpdateMessage {
  channel: 'orders';
  type: 'ORDER_UPDATE';
  data: {
    orderId: string;
    status: string;
    offerId: string;
    amount: number;
    userId: string;
    userDisplayName: string;
  };
}

export interface WSStateSyncResponse {
  type: 'STATE_SYNC';
  data: {
    timelineEvents: TimelineEvent[];
    currentOffer?: ActiveOffer;
    pinnedMessage?: ChatMessageWithUser;
    viewerCount: number;
    hostStatus: {
      isLive: boolean;
      streamHealth?: 'healthy' | 'degraded' | 'offline';
    };
  };
}

export interface WSErrorMessage {
  type: 'ERROR';
  data: {
    code: string;
    message: string;
  };
}

export interface WSPongMessage {
  type: 'PONG';
}

export type WSServerMessage =
  | WSTimelineEventMessage
  | WSChatMessageResponse
  | WSChatDeleteMessage
  | WSChatPinMessage
  | WSViewerCountMessage
  | WSHostStatusMessage
  | WSOrderUpdateMessage
  | WSStateSyncResponse
  | WSErrorMessage
  | WSPongMessage;
