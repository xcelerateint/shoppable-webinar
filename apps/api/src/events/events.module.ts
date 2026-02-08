import { Module, forwardRef } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { VideoModule } from '../video/video.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [VideoModule, forwardRef(() => TimelineModule)],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
