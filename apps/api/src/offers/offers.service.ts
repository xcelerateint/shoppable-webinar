import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { TimelineService } from '../timeline/timeline.service';
import { EventsService } from '../events/events.service';
import { CreateOfferDto, UpdateOfferDto, OpenOfferDto, CloseOfferDto } from './dto/offer.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OffersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Inject(forwardRef(() => TimelineService))
    private timelineService: TimelineService,
    @Inject(forwardRef(() => EventsService))
    private eventsService: EventsService,
  ) {}

  async create(eventId: string, hostId: string, dto: CreateOfferDto) {
    const event = await this.eventsService.findById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to create offers for this event');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.offer.create({
      data: {
        eventId,
        productId: dto.productId,
        title: dto.title,
        description: dto.description,
        offerPrice: dto.offerPrice,
        originalPrice: dto.originalPrice,
        discountPercent: dto.discountPercent,
        quantityLimit: dto.quantityLimit,
        timeLimitSeconds: dto.timeLimitSeconds,
      },
      include: {
        product: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.offer.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });
  }

  async findByEvent(eventId: string) {
    return this.prisma.offer.findMany({
      where: { eventId },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findActiveByEvent(eventId: string) {
    return this.prisma.offer.findFirst({
      where: {
        eventId,
        status: 'active',
      },
      include: {
        product: true,
      },
    });
  }

  async update(offerId: string, hostId: string, dto: UpdateOfferDto) {
    const offer = await this.findById(offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const event = await this.eventsService.findById(offer.eventId);
    if (!event || event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to update this offer');
    }

    if (offer.status !== 'pending') {
      throw new BadRequestException('Can only update pending offers');
    }

    return this.prisma.offer.update({
      where: { id: offerId },
      data: {
        title: dto.title,
        description: dto.description,
        offerPrice: dto.offerPrice,
        originalPrice: dto.originalPrice,
        discountPercent: dto.discountPercent,
        quantityLimit: dto.quantityLimit,
        timeLimitSeconds: dto.timeLimitSeconds,
      },
      include: {
        product: true,
      },
    });
  }

  async openOffer(offerId: string, hostId: string, dto: OpenOfferDto) {
    const offer = await this.findById(offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const event = await this.eventsService.findById(offer.eventId);
    if (!event || event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to open this offer');
    }

    if (offer.status !== 'pending' && offer.status !== 'paused') {
      throw new BadRequestException('Offer cannot be opened');
    }

    // Close any active offer for this event first
    await this.prisma.offer.updateMany({
      where: {
        eventId: offer.eventId,
        status: 'active',
      },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    });

    const updatedOffer = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: 'active',
        openedAt: new Date(),
      },
      include: {
        product: true,
      },
    });

    // Create timeline event
    const eventStart = await this.eventsService.getEventStartTime(offer.eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    await this.timelineService.create(offer.eventId, hostId, {
      type: 'OFFER_OPEN',
      payload: {
        offerId: offer.id,
        title: offer.title,
        description: offer.description,
        price: Number(offer.offerPrice),
        originalPrice: offer.originalPrice ? Number(offer.originalPrice) : undefined,
        discountPercent: offer.discountPercent,
        quantityLimit: offer.quantityLimit,
        quantityRemaining: offer.quantityLimit ? offer.quantityLimit - offer.quantityClaimed : undefined,
        timeLimitSeconds: offer.timeLimitSeconds,
        product: {
          id: offer.product.id,
          name: offer.product.name,
          imageUrl: offer.product.imageUrl,
        },
      },
      idempotencyKey: dto.idempotencyKey,
      timestampMs,
    });

    // Schedule auto-close if time limit
    if (offer.timeLimitSeconds) {
      setTimeout(async () => {
        const currentOffer = await this.findById(offerId);
        if (currentOffer?.status === 'active') {
          await this.closeOfferInternal(offerId, 'expired');
        }
      }, offer.timeLimitSeconds * 1000);
    }

    return updatedOffer;
  }

  async closeOffer(offerId: string, hostId: string, dto: CloseOfferDto) {
    const offer = await this.findById(offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const event = await this.eventsService.findById(offer.eventId);
    if (!event || event.hostId !== hostId) {
      throw new ForbiddenException('Not authorized to close this offer');
    }

    return this.closeOfferInternal(offerId, dto.reason || 'manual', dto.idempotencyKey, hostId);
  }

  private async closeOfferInternal(
    offerId: string,
    reason: 'manual' | 'sold_out' | 'expired',
    idempotencyKey?: string,
    hostId?: string,
  ) {
    const offer = await this.findById(offerId);
    if (!offer || offer.status !== 'active') {
      return offer;
    }

    const updatedOffer = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
      include: {
        product: true,
      },
    });

    // Calculate revenue
    const orders = await this.prisma.order.findMany({
      where: {
        offerId,
        status: 'paid',
      },
    });
    const revenue = orders.reduce((sum, order) => sum + Number(order.amount), 0);

    // Create timeline event
    const eventStart = await this.eventsService.getEventStartTime(offer.eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    await this.timelineService.create(offer.eventId, hostId || 'system', {
      type: 'OFFER_CLOSE',
      payload: {
        offerId: offer.id,
        reason,
        quantitySold: offer.quantityClaimed,
        revenue,
      },
      idempotencyKey: idempotencyKey || `close_${offerId}_${Date.now()}`,
      timestampMs,
    });

    return updatedOffer;
  }

  async incrementClaimed(offerId: string): Promise<{ success: boolean; quantityRemaining: number }> {
    const offer = await this.findById(offerId);
    if (!offer || offer.status !== 'active') {
      return { success: false, quantityRemaining: 0 };
    }

    if (offer.quantityLimit && offer.quantityClaimed >= offer.quantityLimit) {
      return { success: false, quantityRemaining: 0 };
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        quantityClaimed: { increment: 1 },
      },
    });

    const quantityRemaining = offer.quantityLimit
      ? offer.quantityLimit - updated.quantityClaimed
      : -1;

    // Auto-close if sold out
    if (offer.quantityLimit && updated.quantityClaimed >= offer.quantityLimit) {
      await this.closeOfferInternal(offerId, 'sold_out');
    }

    return { success: true, quantityRemaining };
  }
}
