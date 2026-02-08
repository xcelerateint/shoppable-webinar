import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto, DropLinkDto, DropFileDto } from './dto/asset.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('assets')
@Controller('events/:eventId')
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Post('assets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an asset' })
  async createAsset(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateAssetDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const fileInfo = file
      ? {
          key: `events/${eventId}/assets/${Date.now()}-${file.originalname}`,
          size: file.size,
          mimeType: file.mimetype,
        }
      : undefined;
    return this.assetsService.createAsset(eventId, user.id, dto, fileInfo);
  }

  @Get('assets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List assets for event' })
  async findByEvent(@Param('eventId') eventId: string) {
    return this.assetsService.findByEvent(eventId);
  }

  @Delete('assets/:assetId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an asset' })
  async delete(
    @Param('eventId') eventId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.assetsService.delete(assetId, user.id);
  }

  @Post('drops/link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Drop a link to viewers' })
  async dropLink(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: DropLinkDto,
  ) {
    return this.assetsService.dropLink(eventId, user.id, dto);
  }

  @Post('drops/file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Drop a file to viewers' })
  async dropFile(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: DropFileDto,
  ) {
    return this.assetsService.dropFile(eventId, user.id, dto);
  }

  @Get('assets/:assetId/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get signed download URL for asset' })
  async getDownloadUrl(
    @Param('assetId') assetId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const url = await this.assetsService.getSignedDownloadUrl(assetId, user.id);
    return { url };
  }
}
