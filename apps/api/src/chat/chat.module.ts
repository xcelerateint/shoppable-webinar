import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { WebsocketModule } from '../websocket/websocket.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [forwardRef(() => WebsocketModule), forwardRef(() => EventsModule)],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
