import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimelineService } from './timeline.service';
import { CreateTimelineEventDto, CreateCountdownDto, CreateChapterDto } from './dto/timeline.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { EventsService } from '../events/events.service';

@ApiTags('timeline')
@Controller('events/:eventId')
export class TimelineController {
  constructor(
    private timelineService: TimelineService,
    private eventsService: EventsService,
  ) {}

  @Get('timeline')
  @ApiOperation({ summary: 'Get timeline events for an event' })
  async findByEvent(
    @Param('eventId') eventId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.timelineService.findByEvent(eventId, limit, offset);
  }

  @Post('timeline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a timeline event' })
  async create(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateTimelineEventDto,
  ) {
    const eventStart = await this.eventsService.getEventStartTime(eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    return this.timelineService.create(eventId, user.id, {
      type: dto.type,
      payload: dto.payload,
      idempotencyKey: dto.idempotencyKey,
      timestampMs,
    });
  }

  @Post('countdown')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a countdown' })
  async createCountdown(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateCountdownDto,
  ) {
    const eventStart = await this.eventsService.getEventStartTime(eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    return this.timelineService.createCountdown(
      eventId,
      user.id,
      dto.durationSeconds,
      dto.label,
      dto.idempotencyKey,
      timestampMs,
    );
  }

  @Post('chapter')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a chapter marker' })
  async createChapter(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateChapterDto,
  ) {
    const eventStart = await this.eventsService.getEventStartTime(eventId);
    const timestampMs = eventStart ? Date.now() - eventStart.getTime() : 0;

    return this.timelineService.createChapterMark(
      eventId,
      user.id,
      dto.title,
      dto.description,
      dto.idempotencyKey,
      timestampMs,
    );
  }

  @Get('replay')
  @ApiOperation({ summary: 'Get replay data (recording + timeline)' })
  async getReplayData(@Param('eventId') eventId: string) {
    const data = await this.timelineService.getReplayData(eventId);
    if (!data) {
      throw new NotFoundException('Replay not available');
    }
    return data;
  }
}
