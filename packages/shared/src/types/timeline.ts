import { LayoutMode } from './event';
import { Offer } from './offer';
import { Slide } from './presentation';

export type TimelineEventType =
  | 'LINK_DROP'
  | 'FILE_DROP'
  | 'OFFER_OPEN'
  | 'OFFER_CLOSE'
  | 'COUNTDOWN_START'
  | 'COUNTDOWN_END'
  | 'CHAPTER_MARK'
  | 'PIN_MESSAGE'
  | 'CHAT_MOD_ACTION'
  | 'ORDER_CREATED'
  | 'ORDER_PAID'
  | 'ORDER_FAILED'
  | 'PRESENTATION_START'
  | 'PRESENTATION_END'
  | 'SLIDE_CHANGE'
  | 'LAYOUT_CHANGE';

export interface BaseTimelineEvent {
  id: string;
  eventId: string;
  type: TimelineEventType;
  timestampMs: number;
  createdBy?: string;
  idempotencyKey?: string;
  createdAt: Date;
}

export interface LinkDropPayload {
  title: string;
  url: string;
  description?: string;
  thumbnailUrl?: string;
  requiresPurchase: boolean;
  offerId?: string;
}

export interface FileDropPayload {
  title: string;
  fileKey: string;
  signedUrl: string;
  description?: string;
  fileSize?: number;
  mimeType?: string;
  requiresPurchase: boolean;
  offerId?: string;
}

export interface OfferOpenPayload {
  offerId: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  quantityLimit?: number;
  quantityRemaining?: number;
  timeLimitSeconds?: number;
  product: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export interface OfferClosePayload {
  offerId: string;
  reason: 'sold_out' | 'expired' | 'manual';
  quantitySold: number;
  revenue: number;
}

export interface CountdownStartPayload {
  durationSeconds: number;
  label: string;
  endsAt: string;
}

export interface ChapterMarkPayload {
  title: string;
  description?: string;
}

export interface PinMessagePayload {
  messageId: string;
  action: 'pin' | 'unpin';
  message?: {
    content: string;
    user: { displayName: string };
  };
}

export interface ChatModActionPayload {
  messageId: string;
  action: 'delete' | 'timeout';
  moderatorId: string;
  reason?: string;
}

export interface OrderCreatedPayload {
  orderId: string;
  userId: string;
  offerId: string;
  amount: number;
}

export interface OrderPaidPayload {
  orderId: string;
  userId: string;
  offerId: string;
  amount: number;
  unlocks?: string[];
}

export interface OrderFailedPayload {
  orderId: string;
  reason: string;
}

export interface PresentationStartPayload {
  presentationId: string;
  title: string;
  totalSlides: number;
  initialSlideIndex: number;
  initialSlide: Slide;
}

export interface PresentationEndPayload {
  presentationId: string;
}

export interface SlideChangePayload {
  presentationId: string;
  slideIndex: number;
  totalSlides: number;
  slide: Slide;
  direction: 'forward' | 'backward';
}

export interface LayoutChangePayload {
  mode: LayoutMode;
  transitionDurationMs?: number;
}

export type TimelineEventPayload =
  | LinkDropPayload
  | FileDropPayload
  | OfferOpenPayload
  | OfferClosePayload
  | CountdownStartPayload
  | ChapterMarkPayload
  | PinMessagePayload
  | ChatModActionPayload
  | OrderCreatedPayload
  | OrderPaidPayload
  | OrderFailedPayload
  | PresentationStartPayload
  | PresentationEndPayload
  | SlideChangePayload
  | LayoutChangePayload;

export interface TimelineEvent extends BaseTimelineEvent {
  payload: TimelineEventPayload;
}

export interface CreateTimelineEventRequest {
  type: TimelineEventType;
  payload: TimelineEventPayload;
  idempotencyKey: string;
}
