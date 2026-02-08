import { PublicUser } from './user';

export interface ChatMessage {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  isPinned: boolean;
  isDeleted: boolean;
  deletedBy?: string;
  timestampMs: number;
  createdAt: Date;
}

export interface ChatMessageWithUser extends ChatMessage {
  user: PublicUser;
}

export interface SendChatMessageRequest {
  content: string;
  idempotencyKey: string;
}

export interface PinMessageRequest {
  messageId: string;
}

export interface DeleteMessageRequest {
  reason?: string;
}

export interface ChatSettings {
  enabled: boolean;
  slowModeSeconds?: number;
  subscriberOnly: boolean;
  autoModEnabled: boolean;
}
