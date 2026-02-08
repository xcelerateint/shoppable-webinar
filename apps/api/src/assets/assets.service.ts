import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { TimelineService } from '../timeline/timeline.service';
import { DropLinkDto, DropFileDto, CreateAssetDto } from './dto/asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => EventsService))
    private eventsService: EventsService,
    @Inject(forwardRef(() => TimelineService))
    private timelineService: TimelineService,
  ) {}

  async createAsset(eventId: string, hostId: string, dto: CreateAssetDto, fileInfo?: { key: string; size: number; mimeType: string }) {
    const event = await this.eventsService.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    return this.prisma.eventAsset.create({
      data: {
        eventId,
        type: fileInfo ? 'file' : 'link',
        title: dto.title,
        url: fileInfo ? `https://s3.example.com/${fileInfo.key}` : dto.url!,
        fileKey: fileInfo?.key,
        fileSize: fileInfo?.size,
        mimeType: fileInfo?.mimeType,
        requiresPurchase: dto.requiresPurchase || false,
        offerId: dto.offerId,
      },
    });
  }

  async findByEvent(eventId: string) {
    return this.prisma.eventAsset.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(assetId: string, hostId: string) {
    const asset = await this.prisma.eventAsset.findUnique({
      where: { id: assetId },
      include: { event: true },
    });

    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    await this.prisma.eventAsset.delete({ where: { id: assetId } });
  }

  async dropLink(eventId: string, hostId: string, dto: DropLinkDto) {
    const event = await this.eventsService.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    // Create asset if it doesn't exist
    let asset;
    if (!dto.assetId) {
      asset = await this.prisma.eventAsset.create({
        data: {
          eventId,
          type: 'link',
          title: dto.title,
          url: dto.url,
          requiresPurchase: dto.requiresPurchase || false,
          offerId: dto.offerId,
        },
      });
    }

    const eventStart = await this.eventsService.getEventStartTime(eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    await this.timelineService.create(eventId, hostId, {
      type: 'LINK_DROP',
      payload: {
        title: dto.title,
        url: dto.url,
        description: dto.description,
        requiresPurchase: dto.requiresPurchase || false,
        offerId: dto.offerId,
      },
      idempotencyKey: dto.idempotencyKey,
      timestampMs,
    });

    return asset || { success: true };
  }

  async dropFile(eventId: string, hostId: string, dto: DropFileDto) {
    const event = await this.eventsService.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    const asset = await this.prisma.eventAsset.findUnique({
      where: { id: dto.assetId },
    });

    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.eventId !== eventId) throw new ForbiddenException('Asset not in this event');

    // Generate signed URL for download
    const signedUrl = await this.generateSignedUrl(asset.fileKey!);

    const eventStart = await this.eventsService.getEventStartTime(eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    await this.timelineService.create(eventId, hostId, {
      type: 'FILE_DROP',
      payload: {
        title: asset.title,
        fileKey: asset.fileKey,
        signedUrl,
        fileSize: Number(asset.fileSize),
        mimeType: asset.mimeType,
        requiresPurchase: asset.requiresPurchase,
        offerId: asset.offerId,
      },
      idempotencyKey: dto.idempotencyKey,
      timestampMs,
    });

    return { success: true };
  }

  private async generateSignedUrl(fileKey: string): Promise<string> {
    // In production, use AWS SDK to generate presigned URL
    // For now, return a mock URL
    return `https://s3.example.com/${fileKey}?signature=xxx&expires=${Date.now() + 3600000}`;
  }

  async getSignedDownloadUrl(assetId: string, userId: string) {
    const asset = await this.prisma.eventAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.requiresPurchase && asset.offerId) {
      const order = await this.prisma.order.findFirst({
        where: {
          userId,
          offerId: asset.offerId,
          status: 'paid',
        },
      });

      if (!order) {
        throw new ForbiddenException('Purchase required to access this file');
      }
    }

    return this.generateSignedUrl(asset.fileKey!);
  }
}
