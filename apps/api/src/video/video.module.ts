import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { MuxProvider } from './providers/mux.provider';

@Module({
  providers: [
    VideoService,
    {
      provide: 'VIDEO_PROVIDER',
      useClass: MuxProvider,
    },
  ],
  exports: [VideoService],
})
export class VideoModule {}
