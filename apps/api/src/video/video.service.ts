import { Injectable, Inject } from '@nestjs/common';
import { VideoProvider, StreamInfo, StreamStatus, RecordingInfo } from './video.interface';

@Injectable()
export class VideoService {
  constructor(
    @Inject('VIDEO_PROVIDER')
    private videoProvider: VideoProvider,
  ) {}

  async createLiveStream(eventId: string): Promise<StreamInfo> {
    return this.videoProvider.createLiveStream(eventId);
  }

  async endLiveStream(streamId: string): Promise<void> {
    return this.videoProvider.endLiveStream(streamId);
  }

  async getStreamStatus(streamId: string): Promise<StreamStatus> {
    return this.videoProvider.getStreamStatus(streamId);
  }

  async getRecording(assetId: string): Promise<RecordingInfo> {
    return this.videoProvider.getRecording(assetId);
  }

  getIngestUrl(): string {
    return this.videoProvider.getIngestUrl();
  }
}
