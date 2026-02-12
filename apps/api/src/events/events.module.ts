import { Module, forwardRef } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { VideoModule } from '../video/video.module';
import { TimelineModule } from '../timeline/timeline.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [VideoModule, forwardRef(() => TimelineModule), forwardRef(() => WebsocketModule)],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
