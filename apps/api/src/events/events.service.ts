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
import { spawn, ChildProcess } from 'child_process';

@Injectable()
export class EventsService {
  private testStreamProcesses: Map<string, ChildProcess> = new Map();

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

  async startTestStream(id: string, hostId: string) {
    const event = await this.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to start this event');
    }

    // First set event to live if not already
    if (event.status === 'scheduled') {
      await this.prisma.event.update({
        where: { id },
        data: {
          status: 'live',
          actualStart: new Date(),
        },
      });
    }

    // Check if already streaming
    if (this.testStreamProcesses.has(id)) {
      return { message: 'Test stream already running', status: 'streaming' };
    }

    const streamKey = event.streamKey;
    const rtmpUrl = `rtmps://global-live.mux.com:443/app/${streamKey}`;

    // Use FFmpeg to generate a test pattern and stream to Mux
    // This creates a colored bars test pattern with a timestamp
    const ffmpegArgs = [
      '-re',
      '-f', 'lavfi',
      '-i', `testsrc=size=1280x720:rate=30,drawtext=fontfile=Arial:fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:text='LIVE TEST STREAM':box=1:boxcolor=black@0.5`,
      '-f', 'lavfi',
      '-i', 'sine=frequency=1000:sample_rate=44100',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-b:v', '2500k',
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      '-pix_fmt', 'yuv420p',
      '-g', '60',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'flv',
      rtmpUrl,
    ];

    try {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      this.testStreamProcesses.set(id, ffmpeg);

      ffmpeg.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data}`);
      });

      ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        this.testStreamProcesses.delete(id);
      });

      ffmpeg.on('error', (err) => {
        console.error('Failed to start FFmpeg:', err);
        this.testStreamProcesses.delete(id);
      });

      return {
        message: 'Test stream started',
        status: 'streaming',
        note: 'Streaming test pattern to Mux. The video should appear in a few seconds.',
      };
    } catch (error) {
      console.error('Error starting test stream:', error);
      throw new BadRequestException(
        'Failed to start test stream. Make sure FFmpeg is installed on the server.',
      );
    }
  }

  async stopTestStream(id: string, hostId: string) {
    const event = await this.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to stop this event');
    }

    const process = this.testStreamProcesses.get(id);
    if (process) {
      process.kill('SIGTERM');
      this.testStreamProcesses.delete(id);
      return { message: 'Test stream stopped', status: 'stopped' };
    }

    return { message: 'No test stream running', status: 'idle' };
  }

  async triggerSoundEffect(id: string, hostId: string, soundId: string) {
    const event = await this.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to trigger sound effects');
    }

    // Broadcast sound effect to all viewers via Redis pub/sub
    await this.redis.publish(`event:${id}:sound`, JSON.stringify({
      type: 'SOUND_EFFECT',
      soundId,
      timestamp: Date.now(),
    }));

    return { success: true, soundId };
  }
}
