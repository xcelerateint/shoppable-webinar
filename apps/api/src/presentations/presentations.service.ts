import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { TimelineService } from '../timeline/timeline.service';
import {
  CreatePresentationDto,
  CreateSlideDto,
  UpdateSlideDto,
  GoToSlideDto,
  ChangeLayoutDto,
} from './dto/presentation.dto';

@Injectable()
export class PresentationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsService))
    private eventsService: EventsService,
    @Inject(forwardRef(() => TimelineService))
    private timelineService: TimelineService,
  ) {}

  async create(eventId: string, hostId: string, dto: CreatePresentationDto) {
    const event = await this.eventsService.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    return this.prisma.presentation.create({
      data: {
        eventId,
        title: dto.title,
      },
      include: { slides: true },
    });
  }

  async findByEvent(eventId: string) {
    return this.prisma.presentation.findMany({
      where: { eventId },
      include: { slides: { orderBy: { slideIndex: 'asc' } } },
    });
  }

  async findById(id: string) {
    return this.prisma.presentation.findUnique({
      where: { id },
      include: { slides: { orderBy: { slideIndex: 'asc' } } },
    });
  }

  async addSlide(presentationId: string, hostId: string, dto: CreateSlideDto, contentUrl: string, thumbnailUrl?: string) {
    const presentation = await this.findById(presentationId);
    if (!presentation) throw new NotFoundException('Presentation not found');

    const event = await this.eventsService.findById(presentation.eventId);
    if (!event || event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    const slideCount = presentation.slides.length;

    return this.prisma.slide.create({
      data: {
        presentationId,
        slideIndex: slideCount,
        type: dto.type || 'image',
        title: dto.title,
        contentUrl,
        thumbnailUrl,
        notes: dto.notes,
        durationSeconds: dto.durationSeconds,
        transition: dto.transition || 'fade',
      },
    });
  }

  async updateSlide(presentationId: string, slideIndex: number, hostId: string, dto: UpdateSlideDto) {
    const presentation = await this.findById(presentationId);
    if (!presentation) throw new NotFoundException('Presentation not found');

    const event = await this.eventsService.findById(presentation.eventId);
    if (!event || event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    return this.prisma.slide.update({
      where: {
        presentationId_slideIndex: { presentationId, slideIndex },
      },
      data: {
        title: dto.title,
        notes: dto.notes,
        durationSeconds: dto.durationSeconds,
        transition: dto.transition,
      },
    });
  }

  async deleteSlide(presentationId: string, slideIndex: number, hostId: string) {
    const presentation = await this.findById(presentationId);
    if (!presentation) throw new NotFoundException('Presentation not found');

    const event = await this.eventsService.findById(presentation.eventId);
    if (!event || event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    await this.prisma.slide.delete({
      where: {
        presentationId_slideIndex: { presentationId, slideIndex },
      },
    });

    // Reindex remaining slides
    await this.prisma.$executeRaw`
      UPDATE slides
      SET slide_index = slide_index - 1
      WHERE presentation_id = ${presentationId} AND slide_index > ${slideIndex}
    `;
  }

  async startPresentation(eventId: string, hostId: string, presentationId: string, idempotencyKey: string) {
    const event = await this.eventsService.findById(eventId);
    if (!event || event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    const presentation = await this.findById(presentationId);
    if (!presentation) throw new NotFoundException('Presentation not found');
    if (presentation.slides.length === 0) throw new BadRequestException('Presentation has no slides');

    // Deactivate any active presentation
    await this.prisma.presentation.updateMany({
      where: { eventId, isActive: true },
      data: { isActive: false },
    });

    // Activate this presentation
    await this.prisma.presentation.update({
      where: { id: presentationId },
      data: { isActive: true, currentSlideIndex: 0 },
    });

    const eventStart = await this.eventsService.getEventStartTime(eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    await this.timelineService.create(eventId, hostId, {
      type: 'PRESENTATION_START',
      payload: {
        presentationId,
        title: presentation.title,
        totalSlides: presentation.slides.length,
        initialSlideIndex: 0,
        initialSlide: presentation.slides[0],
      },
      idempotencyKey,
      timestampMs,
    });

    return presentation;
  }

  async stopPresentation(eventId: string, hostId: string, idempotencyKey: string) {
    const event = await this.eventsService.findById(eventId);
    if (!event || event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    const activePresentation = await this.prisma.presentation.findFirst({
      where: { eventId, isActive: true },
    });

    if (!activePresentation) throw new BadRequestException('No active presentation');

    await this.prisma.presentation.update({
      where: { id: activePresentation.id },
      data: { isActive: false },
    });

    const eventStart = await this.eventsService.getEventStartTime(eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    await this.timelineService.create(eventId, hostId, {
      type: 'PRESENTATION_END',
      payload: { presentationId: activePresentation.id },
      idempotencyKey,
      timestampMs,
    });
  }

  async goToSlide(eventId: string, hostId: string, dto: GoToSlideDto) {
    const event = await this.eventsService.findById(eventId);
    if (!event || event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    const presentation = await this.findById(dto.presentationId);
    if (!presentation || !presentation.isActive) throw new BadRequestException('Presentation not active');
    if (dto.slideIndex < 0 || dto.slideIndex >= presentation.slides.length) {
      throw new BadRequestException('Invalid slide index');
    }

    const previousIndex = presentation.currentSlideIndex;
    const direction = dto.slideIndex > previousIndex ? 'forward' : 'backward';

    await this.prisma.presentation.update({
      where: { id: dto.presentationId },
      data: { currentSlideIndex: dto.slideIndex },
    });

    const slide = presentation.slides[dto.slideIndex];

    const eventStart = await this.eventsService.getEventStartTime(eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    await this.timelineService.create(eventId, hostId, {
      type: 'SLIDE_CHANGE',
      payload: {
        presentationId: dto.presentationId,
        slideIndex: dto.slideIndex,
        totalSlides: presentation.slides.length,
        slide,
        direction,
      },
      idempotencyKey: dto.idempotencyKey,
      timestampMs,
    });

    return slide;
  }

  async changeLayout(eventId: string, hostId: string, dto: ChangeLayoutDto) {
    const event = await this.eventsService.findById(eventId);
    if (!event || event.hostId !== hostId) throw new ForbiddenException('Not authorized');

    const eventStart = await this.eventsService.getEventStartTime(eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    await this.timelineService.create(eventId, hostId, {
      type: 'LAYOUT_CHANGE',
      payload: { mode: dto.mode, transitionDurationMs: 300 },
      idempotencyKey: dto.idempotencyKey,
      timestampMs,
    });
  }
}
