import { PublicUser } from './user';

export type EventStatus = 'draft' | 'scheduled' | 'live' | 'ended' | 'archived';

export interface Event {
  id: string;
  hostId: string;
  title: string;
  description?: string;
  slug: string;
  status: EventStatus;
  scheduledStart?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  streamKey?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  maxViewers: number;
  chatEnabled: boolean;
  offersEnabled: boolean;
  replayOffersEnabled: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventWithHost extends Event {
  host: PublicUser;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  scheduledStart?: string;
  isPublic?: boolean;
  chatEnabled?: boolean;
  offersEnabled?: boolean;
  replayOffersEnabled?: boolean;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  scheduledStart?: string;
  isPublic?: boolean;
  chatEnabled?: boolean;
  offersEnabled?: boolean;
  replayOffersEnabled?: boolean;
  thumbnailUrl?: string;
}

export interface ViewerEventData {
  id: string;
  title: string;
  description?: string;
  status: EventStatus;
  host: PublicUser;
  playbackUrl?: string;
  thumbnailUrl?: string;
  chatEnabled: boolean;
  offersEnabled: boolean;
  scheduledStart?: Date;
  actualStart?: Date;
  viewerCount: number;
}

export interface StreamInfo {
  streamKey: string;
  ingestUrl: string;
  playbackUrl: string;
}

export type LayoutMode = 'video_only' | 'slides_only' | 'slides_main' | 'video_main' | 'side_by_side';
