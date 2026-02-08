import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PresentationsService } from './presentations.service';
import {
  CreatePresentationDto,
  CreateSlideDto,
  UpdateSlideDto,
  GoToSlideDto,
  ChangeLayoutDto,
  StartPresentationDto,
  StopPresentationDto,
} from './dto/presentation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('presentations')
@Controller()
export class PresentationsController {
  constructor(private presentationsService: PresentationsService) {}

  @Post('events/:eventId/presentations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a presentation' })
  async create(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreatePresentationDto,
  ) {
    return this.presentationsService.create(eventId, user.id, dto);
  }

  @Get('events/:eventId/presentations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all presentations for an event' })
  async findByEvent(@Param('eventId') eventId: string) {
    return this.presentationsService.findByEvent(eventId);
  }

  @Delete('presentations/:presId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a presentation' })
  async delete(@Param('presId') presId: string) {
    // Implementation would check ownership and delete
  }

  @Post('presentations/:presId/slides')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Add a slide (upload image/video)' })
  async addSlide(
    @Param('presId') presId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateSlideDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // In production, upload file to S3 and get URL
    const contentUrl = `https://cdn.example.com/slides/${presId}/${Date.now()}.${file?.mimetype?.split('/')[1] || 'png'}`;
    const thumbnailUrl = contentUrl.replace(/\.[^/.]+$/, '_thumb.jpg');
    return this.presentationsService.addSlide(presId, user.id, dto, contentUrl, thumbnailUrl);
  }

  @Patch('presentations/:presId/slides/:index')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a slide' })
  async updateSlide(
    @Param('presId') presId: string,
    @Param('index') index: number,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateSlideDto,
  ) {
    return this.presentationsService.updateSlide(presId, index, user.id, dto);
  }

  @Delete('presentations/:presId/slides/:index')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a slide' })
  async deleteSlide(
    @Param('presId') presId: string,
    @Param('index') index: number,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.presentationsService.deleteSlide(presId, index, user.id);
  }

  @Post('events/:eventId/presentation/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start showing a presentation' })
  async startPresentation(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: StartPresentationDto,
  ) {
    return this.presentationsService.startPresentation(eventId, user.id, dto.presentationId, dto.idempotencyKey);
  }

  @Post('events/:eventId/presentation/stop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stop showing presentation' })
  async stopPresentation(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: StopPresentationDto,
  ) {
    return this.presentationsService.stopPresentation(eventId, user.id, dto.idempotencyKey);
  }

  @Post('events/:eventId/slide/goto')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Go to a specific slide' })
  async goToSlide(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: GoToSlideDto,
  ) {
    return this.presentationsService.goToSlide(eventId, user.id, dto);
  }

  @Post('events/:eventId/layout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change layout mode' })
  async changeLayout(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ChangeLayoutDto,
  ) {
    return this.presentationsService.changeLayout(eventId, user.id, dto);
  }
}
