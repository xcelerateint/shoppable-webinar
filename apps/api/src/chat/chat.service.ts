import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { EventsService } from '../events/events.service';
import { SendChatMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Inject(forwardRef(() => WebsocketGateway))
    private wsGateway: WebsocketGateway,
    @Inject(forwardRef(() => EventsService))
    private eventsService: EventsService,
  ) {}

  async create(eventId: string, userId: string, dto: SendChatMessageDto) {
    // Check rate limit (10 messages per 30 seconds)
    const rateLimitKey = `chat:ratelimit:${userId}:${eventId}`;
    const { allowed } = await this.redis.checkRateLimit(rateLimitKey, 10, 30);

    if (!allowed) {
      throw new BadRequestException('Rate limit exceeded. Please slow down.');
    }

    // Check idempotency
    const idempotencyKey = `chat:${eventId}:${dto.idempotencyKey}`;
    const isUnique = await this.redis.checkIdempotency(idempotencyKey, 86400);

    if (!isUnique) {
      const existing = await this.prisma.chatMessage.findFirst({
        where: {
          eventId,
          userId,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });
      return existing;
    }

    const event = await this.eventsService.findById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (!event.chatEnabled) {
      throw new ForbiddenException('Chat is disabled for this event');
    }

    const eventStart = event.actualStart;
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : Date.now();

    const message = await this.prisma.chatMessage.create({
      data: {
        eventId,
        userId,
        content: dto.content,
        timestampMs,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    const result = {
      ...message,
      timestampMs: Number(message.timestampMs),
    };

    // Broadcast via WebSocket
    this.wsGateway.broadcastChatMessage(eventId, {
      id: message.id,
      content: message.content,
      user: {
        id: message.user.id,
        displayName: message.user.displayName,
        avatarUrl: message.user.avatarUrl || undefined,
        role: message.user.role,
      },
      timestampMs: Number(message.timestampMs),
      createdAt: message.createdAt,
    });

    return result;
  }

  async findByEvent(eventId: string, limit?: number, beforeId?: string) {
    const takeLimit = limit && limit > 0 ? limit : 100;

    const where: { eventId: string; isDeleted: boolean; createdAt?: { lt: Date } } = {
      eventId,
      isDeleted: false,
    };

    if (beforeId) {
      const beforeMessage = await this.prisma.chatMessage.findUnique({
        where: { id: beforeId },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: takeLimit,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    // Convert BigInt to Number for JSON serialization
    return messages.map(msg => ({
      ...msg,
      timestampMs: Number(msg.timestampMs),
    }));
  }

  async delete(messageId: string, moderatorId: string, reason?: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { event: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is moderator or host
    const moderator = await this.prisma.user.findUnique({
      where: { id: moderatorId },
    });

    if (!moderator) {
      throw new ForbiddenException('Moderator not found');
    }

    const isHost = message.event.hostId === moderatorId;
    const isMod = moderator.role === 'moderator' || moderator.role === 'admin';

    if (!isHost && !isMod) {
      throw new ForbiddenException('Not authorized to delete messages');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedById: moderatorId,
      },
    });

    // Broadcast deletion
    this.wsGateway.broadcastChatDelete(message.eventId, messageId);

    return { success: true };
  }

  async pin(messageId: string, hostId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.event.hostId !== hostId) {
      throw new ForbiddenException('Only host can pin messages');
    }

    // Unpin any existing pinned message
    await this.prisma.chatMessage.updateMany({
      where: {
        eventId: message.eventId,
        isPinned: true,
      },
      data: { isPinned: false },
    });

    // Pin the new message
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isPinned: true },
    });

    // Broadcast pin
    this.wsGateway.broadcastChatPin(message.eventId, messageId, 'pin', {
      id: message.id,
      content: message.content,
      user: {
        id: message.user.id,
        displayName: message.user.displayName,
        avatarUrl: message.user.avatarUrl || undefined,
        role: message.user.role,
      },
      timestampMs: Number(message.timestampMs),
      createdAt: message.createdAt,
    });

    return { success: true };
  }

  async unpin(messageId: string, hostId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { event: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.event.hostId !== hostId) {
      throw new ForbiddenException('Only host can unpin messages');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isPinned: false },
    });

    this.wsGateway.broadcastChatPin(message.eventId, messageId, 'unpin');

    return { success: true };
  }

  async getPinnedMessage(eventId: string) {
    const message = await this.prisma.chatMessage.findFirst({
      where: {
        eventId,
        isPinned: true,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    if (!message) return null;

    // Convert BigInt to Number for JSON serialization
    return {
      ...message,
      timestampMs: Number(message.timestampMs),
    };
  }
}
