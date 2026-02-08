import { Module, forwardRef } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { EventsModule } from '../events/events.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [forwardRef(() => EventsModule), forwardRef(() => WebsocketModule)],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
