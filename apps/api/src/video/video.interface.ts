export interface StreamInfo {
  streamKey: string;
  playbackUrl: string;
  ingestUrl: string;
}

export interface StreamStatus {
  status: 'idle' | 'active' | 'ended';
  viewerCount: number;
  healthScore: number;
}

export interface RecordingInfo {
  playbackUrl: string;
  downloadUrl: string;
  duration: number;
  status: 'processing' | 'ready' | 'failed';
}

export interface VideoProvider {
  createLiveStream(eventId: string): Promise<StreamInfo>;
  endLiveStream(streamId: string): Promise<void>;
  getStreamStatus(streamId: string): Promise<StreamStatus>;
  getRecording(assetId: string): Promise<RecordingInfo>;
  getIngestUrl(): string;
}
