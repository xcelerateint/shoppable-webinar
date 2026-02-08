import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.id, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get upcoming public events' })
  async findUpcoming() {
    return this.eventsService.findUpcoming();
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Get currently live events' })
  async findLive() {
    return this.eventsService.findLive();
  }

  @Get('my-events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user hosted events' })
  async findMyEvents(@CurrentUser() user: CurrentUserData) {
    return this.eventsService.findByHost(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get event by ID' })
  async findById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Get(':slug/viewer')
  @Public()
  @ApiOperation({ summary: 'Get viewer event data by slug' })
  async getViewerData(@Param('slug') slug: string) {
    return this.eventsService.getViewerData(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete draft event' })
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.eventsService.delete(id, user.id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish/schedule event' })
  async publish(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.eventsService.publish(id, user.id);
  }

  @Post(':id/go-live')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start live stream' })
  async goLive(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.eventsService.goLive(id, user.id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End live stream' })
  async end(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.eventsService.endEvent(id, user.id);
  }

  @Get(':id/stream-key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get RTMP stream key (host only)' })
  async getStreamKey(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.eventsService.getStreamKey(id, user.id);
  }
}
