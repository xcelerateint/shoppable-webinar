import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OffersModule } from '../offers/offers.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => OffersModule), forwardRef(() => WebsocketModule), UsersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
