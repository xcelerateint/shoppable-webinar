import { Module, forwardRef } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { EventsModule } from '../events/events.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [forwardRef(() => EventsModule), forwardRef(() => TimelineModule)],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
