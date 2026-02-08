export type SlideType = 'image' | 'video' | 'embed' | 'html';
export type SlideTransition = 'none' | 'fade' | 'slide' | 'zoom';

export interface Slide {
  id: string;
  presentationId: string;
  slideIndex: number;
  type: SlideType;
  title?: string;
  contentUrl?: string;
  thumbnailUrl?: string;
  htmlContent?: string;
  notes?: string;
  durationSeconds?: number;
  transition: SlideTransition;
  createdAt: Date;
}

export interface Presentation {
  id: string;
  eventId: string;
  title: string;
  isActive: boolean;
  currentSlideIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresentationWithSlides extends Presentation {
  slides: Slide[];
}

export interface CreatePresentationRequest {
  title: string;
}

export interface CreateSlideRequest {
  title?: string;
  type?: SlideType;
  notes?: string;
  durationSeconds?: number;
  transition?: SlideTransition;
}

export interface UpdateSlideRequest {
  title?: string;
  notes?: string;
  durationSeconds?: number;
  transition?: SlideTransition;
}

export interface ReorderSlidesRequest {
  slideIds: string[];
}

export interface GoToSlideRequest {
  presentationId: string;
  slideIndex: number;
  idempotencyKey: string;
}

export interface ChangeLayoutRequest {
  mode: 'video_only' | 'slides_only' | 'slides_main' | 'video_main' | 'side_by_side';
  idempotencyKey: string;
}
