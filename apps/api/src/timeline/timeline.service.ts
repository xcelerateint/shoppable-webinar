import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { CreateTimelineEventDto } from './dto/timeline.dto';
import { Prisma } from '@prisma/client';

interface CreateTimelineEventParams {
  type: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  timestampMs?: number;
}

@Injectable()
export class TimelineService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Inject(forwardRef(() => WebsocketGateway))
    private wsGateway: WebsocketGateway,
  ) {}

  async create(eventId: string, createdById: string, params: CreateTimelineEventParams) {
    // Check idempotency
    const idempotencyKey = `timeline:${eventId}:${params.idempotencyKey}`;
    const isUnique = await this.redis.checkIdempotency(idempotencyKey, 86400);

    if (!isUnique) {
      // Return existing event
      const existing = await this.prisma.eventTimelineEvent.findFirst({
        where: {
          eventId,
          idempotencyKey: params.idempotencyKey,
        },
      });
      return existing;
    }

    const timelineEvent = await this.prisma.eventTimelineEvent.create({
      data: {
        eventId,
        type: params.type,
        payload: params.payload as Prisma.InputJsonValue,
        timestampMs: params.timestampMs ?? 0,
        createdById: createdById !== 'system' ? createdById : null,
        idempotencyKey: params.idempotencyKey,
      },
    });

    // Broadcast via WebSocket
    this.wsGateway.broadcastTimelineEvent(eventId, {
      id: timelineEvent.id,
      type: timelineEvent.type,
      payload: timelineEvent.payload as Record<string, unknown>,
      timestampMs: Number(timelineEvent.timestampMs),
      createdAt: timelineEvent.createdAt,
    });

    return timelineEvent;
  }

  async findByEvent(eventId: string, limit = 100, offset = 0) {
    return this.prisma.eventTimelineEvent.findMany({
      where: { eventId },
      orderBy: { timestampMs: 'asc' },
      take: limit,
      skip: offset,
    });
  }

  async findByEventSince(eventId: string, sinceId: string) {
    const sinceEvent = await this.prisma.eventTimelineEvent.findUnique({
      where: { id: sinceId },
    });

    if (!sinceEvent) {
      return this.findByEvent(eventId);
    }

    return this.prisma.eventTimelineEvent.findMany({
      where: {
        eventId,
        createdAt: { gt: sinceEvent.createdAt },
      },
      orderBy: { timestampMs: 'asc' },
    });
  }

  async createCountdown(
    eventId: string,
    createdById: string,
    durationSeconds: number,
    label: string,
    idempotencyKey: string,
    timestampMs: number,
  ) {
    const endsAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

    return this.create(eventId, createdById, {
      type: 'COUNTDOWN_START',
      payload: {
        durationSeconds,
        label,
        endsAt,
      },
      idempotencyKey,
      timestampMs,
    });
  }

  async createChapterMark(
    eventId: string,
    createdById: string,
    title: string,
    description: string | undefined,
    idempotencyKey: string,
    timestampMs: number,
  ) {
    return this.create(eventId, createdById, {
      type: 'CHAPTER_MARK',
      payload: {
        title,
        description,
      },
      idempotencyKey,
      timestampMs,
    });
  }

  async getChapters(eventId: string) {
    const chapterEvents = await this.prisma.eventTimelineEvent.findMany({
      where: {
        eventId,
        type: 'CHAPTER_MARK',
      },
      orderBy: { timestampMs: 'asc' },
    });

    return chapterEvents.map((event) => {
      const payload = event.payload as { title: string; description?: string };
      return {
        title: payload.title,
        timestampMs: Number(event.timestampMs),
      };
    });
  }

  async getReplayData(eventId: string) {
    const [event, recording, timeline, chapters] = await Promise.all([
      this.prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          actualStart: true,
          actualEnd: true,
          replayOffersEnabled: true,
        },
      }),
      this.prisma.recording.findFirst({
        where: { eventId, status: 'ready' },
        orderBy: { createdAt: 'desc' },
      }),
      this.findByEvent(eventId),
      this.getChapters(eventId),
    ]);

    if (!event || !recording) {
      return null;
    }

    const durationSeconds =
      event.actualStart && event.actualEnd
        ? Math.floor((event.actualEnd.getTime() - event.actualStart.getTime()) / 1000)
        : recording.durationSeconds || 0;

    return {
      event: {
        id: event.id,
        title: event.title,
        durationSeconds,
      },
      recording: {
        playbackUrl: recording.playbackUrl,
        durationSeconds: recording.durationSeconds,
      },
      timeline: timeline.map((e) => ({
        type: e.type,
        timestampMs: Number(e.timestampMs),
        payload: e.payload,
      })),
      chapters,
      offersEnabled: event.replayOffersEnabled,
    };
  }
}
