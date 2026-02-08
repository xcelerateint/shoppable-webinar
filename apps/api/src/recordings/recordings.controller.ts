import { Controller, Get, Delete, Param, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecordingsService } from './recordings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('recordings')
@Controller()
export class RecordingsController {
  constructor(private recordingsService: RecordingsService) {}

  @Get('events/:eventId/recordings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recordings for event' })
  async findByEvent(@Param('eventId') eventId: string) {
    return this.recordingsService.findByEvent(eventId);
  }

  @Get('recordings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recording by ID' })
  async findById(@Param('id') id: string) {
    return this.recordingsService.findById(id);
  }

  @Post('recordings/:id/refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh recording info from provider' })
  async refresh(@Param('id') id: string) {
    return this.recordingsService.refreshRecordingInfo(id);
  }

  @Delete('recordings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete recording' })
  async delete(@Param('id') id: string) {
    return this.recordingsService.delete(id);
  }

  @Post('webhooks/video')
  @Public()
  @ApiOperation({ summary: 'Video provider webhook handler' })
  async handleVideoWebhook(@Body() payload: Record<string, unknown>) {
    // Handle video provider webhooks (Mux, IVS)
    const type = payload.type as string;
    const data = payload.data as Record<string, unknown>;

    if (type === 'video.asset.ready') {
      await this.recordingsService.updateFromWebhook(data.id as string, {
        playbackUrl: data.playback_url as string,
        status: 'ready',
        durationSeconds: data.duration as number,
      });
    } else if (type === 'video.asset.errored') {
      await this.recordingsService.updateFromWebhook(data.id as string, {
        status: 'failed',
      });
    }

    return { received: true };
  }
}
