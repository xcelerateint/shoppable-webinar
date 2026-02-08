import { Module, forwardRef } from '@nestjs/common';
import { PresentationsService } from './presentations.service';
import { PresentationsController } from './presentations.controller';
import { EventsModule } from '../events/events.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [forwardRef(() => EventsModule), forwardRef(() => TimelineModule)],
  controllers: [PresentationsController],
  providers: [PresentationsService],
  exports: [PresentationsService],
})
export class PresentationsModule {}
