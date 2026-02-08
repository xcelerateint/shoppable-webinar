import { Module, forwardRef } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { TimelineModule } from '../timeline/timeline.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [forwardRef(() => TimelineModule), forwardRef(() => EventsModule)],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
