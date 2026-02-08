import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendChatMessageDto, DeleteMessageDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('chat')
@Controller('events/:eventId/chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Get recent chat messages' })
  async findByEvent(
    @Param('eventId') eventId: string,
    @Query('limit') limit?: number,
    @Query('before') beforeId?: string,
  ) {
    return this.chatService.findByEvent(eventId, limit, beforeId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a chat message' })
  async create(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chatService.create(eventId, user.id, dto);
  }

  @Delete(':messageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a chat message (moderator)' })
  async delete(
    @Param('eventId') eventId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: DeleteMessageDto,
  ) {
    return this.chatService.delete(messageId, user.id, dto.reason);
  }

  @Post(':messageId/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin a chat message' })
  async pin(
    @Param('eventId') eventId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.pin(messageId, user.id);
  }

  @Delete(':messageId/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpin a chat message' })
  async unpin(
    @Param('eventId') eventId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.chatService.unpin(messageId, user.id);
  }

  @Get('pinned')
  @ApiOperation({ summary: 'Get currently pinned message' })
  async getPinned(@Param('eventId') eventId: string) {
    return this.chatService.getPinnedMessage(eventId);
  }
}
