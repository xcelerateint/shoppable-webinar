import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { OffersModule } from './offers/offers.module';
import { OrdersModule } from './orders/orders.module';
import { ChatModule } from './chat/chat.module';
import { TimelineModule } from './timeline/timeline.module';
import { ReferralsModule } from './referrals/referrals.module';
import { RecordingsModule } from './recordings/recordings.module';
import { PresentationsModule } from './presentations/presentations.module';
import { AssetsModule } from './assets/assets.module';
import { WebsocketModule } from './websocket/websocket.module';
import { VideoModule } from './video/video.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 1000,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    EventsModule,
    OffersModule,
    OrdersModule,
    ChatModule,
    TimelineModule,
    ReferralsModule,
    RecordingsModule,
    PresentationsModule,
    AssetsModule,
    WebsocketModule,
    VideoModule,
  ],
})
export class AppModule {}
