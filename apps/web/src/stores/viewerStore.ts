import { create } from 'zustand';

interface ChatMessage {
  id: string;
  content: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    role: string;
  };
  timestampMs: number;
  createdAt: Date;
}

interface TimelineEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestampMs: number;
}

interface ActiveOffer {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  quantityLimit?: number;
  quantityRemaining?: number;
  timeLimitSeconds?: number;
  expiresAt?: Date;
  product: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

interface Slide {
  id: string;
  type: string;
  contentUrl?: string;
  title?: string;
}

type LayoutMode = 'video_only' | 'slides_only' | 'slides_main' | 'video_main' | 'side_by_side';

interface ViewerState {
  // Event info
  eventId: string | null;
  eventTitle: string;
  eventStatus: string;
  playbackUrl: string | null;

  // Presence
  viewerCount: number;
  isHostLive: boolean;

  // Chat
  messages: ChatMessage[];
  pinnedMessage: ChatMessage | null;

  // Timeline
  timelineEvents: TimelineEvent[];

  // Active offer
  activeOffer: ActiveOffer | null;

  // Presentation
  currentPresentation: { id: string; title: string; totalSlides: number } | null;
  currentSlide: Slide | null;
  currentSlideIndex: number;
  layoutMode: LayoutMode;

  // Overlay
  activeOverlay: { type: string; data: Record<string, unknown> } | null;

  // Actions
  setEvent: (eventId: string, title: string, status: string, playbackUrl: string | null) => void;
  setViewerCount: (count: number) => void;
  setHostLive: (isLive: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  deleteMessage: (messageId: string) => void;
  setPinnedMessage: (message: ChatMessage | null) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  setActiveOffer: (offer: ActiveOffer | null) => void;
  updateOfferQuantity: (remaining: number) => void;
  setPresentation: (presentation: { id: string; title: string; totalSlides: number } | null) => void;
  setSlide: (slide: Slide | null, index: number) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setOverlay: (overlay: { type: string; data: Record<string, unknown> } | null) => void;
  reset: () => void;
}

const initialState = {
  eventId: null,
  eventTitle: '',
  eventStatus: '',
  playbackUrl: null,
  viewerCount: 0,
  isHostLive: false,
  messages: [],
  pinnedMessage: null,
  timelineEvents: [],
  activeOffer: null,
  currentPresentation: null,
  currentSlide: null,
  currentSlideIndex: 0,
  layoutMode: 'video_only' as LayoutMode,
  activeOverlay: null,
};

export const useViewerStore = create<ViewerState>((set) => ({
  ...initialState,

  setEvent: (eventId, title, status, playbackUrl) =>
    set({ eventId, eventTitle: title, eventStatus: status, playbackUrl }),

  setViewerCount: (count) => set({ viewerCount: count }),

  setHostLive: (isLive) => set({ isHostLive: isLive }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages.slice(-99), message],
    })),

  deleteMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),

  setPinnedMessage: (message) => set({ pinnedMessage: message }),

  addTimelineEvent: (event) =>
    set((state) => ({
      timelineEvents: [...state.timelineEvents, event],
    })),

  setActiveOffer: (offer) => set({ activeOffer: offer }),

  updateOfferQuantity: (remaining) =>
    set((state) => ({
      activeOffer: state.activeOffer
        ? { ...state.activeOffer, quantityRemaining: remaining }
        : null,
    })),

  setPresentation: (presentation) => set({ currentPresentation: presentation }),

  setSlide: (slide, index) => set({ currentSlide: slide, currentSlideIndex: index }),

  setLayoutMode: (mode) => set({ layoutMode: mode }),

  setOverlay: (overlay) => set({ activeOverlay: overlay }),

  reset: () => set(initialState),
}));
