import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoProvider, StreamInfo, StreamStatus, RecordingInfo } from '../video.interface';

@Injectable()
export class MuxProvider implements VideoProvider {
  private tokenId: string;
  private tokenSecret: string;
  private baseUrl = 'https://api.mux.com';

  constructor(private configService: ConfigService) {
    this.tokenId = this.configService.get<string>('MUX_TOKEN_ID') || '';
    this.tokenSecret = this.configService.get<string>('MUX_TOKEN_SECRET') || '';
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.tokenId}:${this.tokenSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async createLiveStream(eventId: string): Promise<StreamInfo> {
    // In production, make actual API call to Mux
    // For now, return mock data for development
    if (!this.tokenId || !this.tokenSecret) {
      console.log('MUX credentials not configured, using mock stream');
      return {
        streamKey: `mock_sk_${eventId}_${Date.now()}`,
        playbackUrl: `https://stream.mux.com/mock_${eventId}.m3u8`,
        ingestUrl: 'rtmps://global-live.mux.com:443/app',
      };
    }

    const response = await fetch(`${this.baseUrl}/video/v1/live-streams`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playback_policy: ['public'],
        new_asset_settings: {
          playback_policy: ['public'],
        },
        reduced_latency: true,
        passthrough: eventId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Mux live stream: ${response.statusText}`);
    }

    const data = await response.json();
    const liveStream = data.data;

    return {
      streamKey: liveStream.stream_key,
      playbackUrl: `https://stream.mux.com/${liveStream.playback_ids[0].id}.m3u8`,
      ingestUrl: 'rtmps://global-live.mux.com:443/app',
    };
  }

  async endLiveStream(streamId: string): Promise<void> {
    if (!this.tokenId || !this.tokenSecret) {
      console.log('MUX credentials not configured, mock stream ended');
      return;
    }

    // Signal the stream is complete (Mux handles this automatically when stream stops)
    // Optionally disable the stream to prevent restarts
    await fetch(`${this.baseUrl}/video/v1/live-streams/${streamId}/disable`, {
      method: 'PUT',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });
  }

  async getStreamStatus(streamId: string): Promise<StreamStatus> {
    if (!this.tokenId || !this.tokenSecret) {
      return {
        status: 'idle',
        viewerCount: 0,
        healthScore: 100,
      };
    }

    const response = await fetch(`${this.baseUrl}/video/v1/live-streams/${streamId}`, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get stream status: ${response.statusText}`);
    }

    const data = await response.json();
    const liveStream = data.data;

    return {
      status: liveStream.status === 'active' ? 'active' : liveStream.status === 'idle' ? 'idle' : 'ended',
      viewerCount: 0, // Mux doesn't provide this directly, need to use analytics
      healthScore: 100,
    };
  }

  async getRecording(assetId: string): Promise<RecordingInfo> {
    if (!this.tokenId || !this.tokenSecret) {
      return {
        playbackUrl: `https://stream.mux.com/mock_${assetId}.m3u8`,
        downloadUrl: `https://stream.mux.com/mock_${assetId}/high.mp4`,
        duration: 3600,
        status: 'ready',
      };
    }

    const response = await fetch(`${this.baseUrl}/video/v1/assets/${assetId}`, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get recording: ${response.statusText}`);
    }

    const data = await response.json();
    const asset = data.data;

    const status = asset.status === 'ready' ? 'ready' : asset.status === 'errored' ? 'failed' : 'processing';

    return {
      playbackUrl: asset.playback_ids?.[0] ? `https://stream.mux.com/${asset.playback_ids[0].id}.m3u8` : '',
      downloadUrl: asset.master?.url || '',
      duration: asset.duration || 0,
      status,
    };
  }

  getIngestUrl(): string {
    return 'rtmps://global-live.mux.com:443/app';
  }
}
