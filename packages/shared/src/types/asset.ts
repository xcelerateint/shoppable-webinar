export type AssetType = 'link' | 'file';

export interface EventAsset {
  id: string;
  eventId: string;
  type: AssetType;
  title: string;
  url: string;
  fileKey?: string;
  fileSize?: number;
  mimeType?: string;
  requiresPurchase: boolean;
  offerId?: string;
  createdAt: Date;
}

export interface CreateLinkAssetRequest {
  title: string;
  url: string;
  description?: string;
  requiresPurchase?: boolean;
  offerId?: string;
}

export interface CreateFileAssetRequest {
  title: string;
  requiresPurchase?: boolean;
  offerId?: string;
}

export interface DropLinkRequest {
  assetId?: string;
  title: string;
  url: string;
  description?: string;
  requiresPurchase?: boolean;
  offerId?: string;
  idempotencyKey: string;
}

export interface DropFileRequest {
  assetId: string;
  idempotencyKey: string;
}

export interface Recording {
  id: string;
  eventId: string;
  provider: 'mux' | 'ivs';
  providerAssetId: string;
  playbackUrl?: string;
  downloadUrl?: string;
  durationSeconds?: number;
  status: 'processing' | 'ready' | 'failed' | 'deleted';
  fileSize?: number;
  createdAt: Date;
}

export interface ReplayData {
  event: {
    id: string;
    title: string;
    durationSeconds: number;
  };
  recording: {
    playbackUrl: string;
    durationSeconds: number;
  };
  timeline: Array<{
    type: string;
    timestampMs: number;
    payload: Record<string, unknown>;
  }>;
  chapters: Array<{
    title: string;
    timestampMs: number;
  }>;
  offersEnabled: boolean;
}
