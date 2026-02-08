import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { VideoService } from '../video/video.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { EventStatus } from '@prisma/client';
import { generateSlug } from '@shoppable-webinar/shared';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private videoService: VideoService,
  ) {}

  async create(hostId: string, dto: CreateEventDto) {
    const baseSlug = generateSlug(dto.title);
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (await this.prisma.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return this.prisma.event.create({
      data: {
        hostId,
        title: dto.title,
        description: dto.description,
        slug,
        scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : undefined,
        isPublic: dto.isPublic ?? true,
        chatEnabled: dto.chatEnabled ?? true,
        offersEnabled: dto.offersEnabled ?? true,
        replayOffersEnabled: dto.replayOffersEnabled ?? false,
      },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.event.findUnique({
      where: { slug },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async findByHost(hostId: string) {
    return this.prisma.event.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async findUpcoming() {
    return this.prisma.event.findMany({
      where: {
        status: 'scheduled',
        isPublic: true,
        scheduledStart: {
          gte: new Date(),
        },
      },
      orderBy: { scheduledStart: 'asc' },
      take: 20,
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async findLive() {
    return this.prisma.event.findMany({
      where: {
        status: 'live',
        isPublic: true,
      },
      orderBy: { actualStart: 'desc' },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async update(id: string, hostId: string, dto: UpdateEventDto) {
    const event = await this.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to update this event');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : undefined,
        isPublic: dto.isPublic,
        chatEnabled: dto.chatEnabled,
        offersEnabled: dto.offersEnabled,
        replayOffersEnabled: dto.replayOffersEnabled,
        thumbnailUrl: dto.thumbnailUrl,
      },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async delete(id: string, hostId: string) {
    const event = await this.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to delete this event');
    }
    if (event.status !== 'draft') {
      throw new BadRequestException('Only draft events can be deleted');
    }

    await this.prisma.event.delete({ where: { id } });
  }

  async publish(id: string, hostId: string) {
    const event = await this.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to publish this event');
    }
    if (event.status !== 'draft') {
      throw new BadRequestException('Only draft events can be published');
    }

    // Create stream with video provider
    const streamInfo = await this.videoService.createLiveStream(id);

    return this.prisma.event.update({
      where: { id },
      data: {
        status: 'scheduled',
        streamKey: streamInfo.streamKey,
        playbackUrl: streamInfo.playbackUrl,
      },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async goLive(id: string, hostId: string) {
    const event = await this.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to start this event');
    }
    if (event.status !== 'scheduled') {
      throw new BadRequestException('Only scheduled events can go live');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        status: 'live',
        actualStart: new Date(),
      },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async endEvent(id: string, hostId: string) {
    const event = await this.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to end this event');
    }
    if (event.status !== 'live') {
      throw new BadRequestException('Only live events can be ended');
    }

    // End stream with video provider
    if (event.streamKey) {
      await this.videoService.endLiveStream(event.streamKey);
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        status: 'ended',
        actualEnd: new Date(),
      },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async getStreamKey(id: string, hostId: string) {
    const event = await this.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to view stream key');
    }

    return {
      streamKey: event.streamKey,
      ingestUrl: this.videoService.getIngestUrl(),
      playbackUrl: event.playbackUrl,
    };
  }

  async getViewerData(slug: string) {
    const event = await this.findBySlug(slug);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const viewerCount = await this.redis.getViewerCount(event.id);

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      status: event.status,
      host: event.host,
      playbackUrl: event.playbackUrl,
      thumbnailUrl: event.thumbnailUrl,
      chatEnabled: event.chatEnabled,
      offersEnabled: event.offersEnabled,
      scheduledStart: event.scheduledStart,
      actualStart: event.actualStart,
      viewerCount,
    };
  }

  async updateStatus(id: string, status: EventStatus) {
    return this.prisma.event.update({
      where: { id },
      data: { status },
    });
  }

  async getEventStartTime(eventId: string): Promise<Date | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { actualStart: true },
    });
    return event?.actualStart || null;
  }
}
