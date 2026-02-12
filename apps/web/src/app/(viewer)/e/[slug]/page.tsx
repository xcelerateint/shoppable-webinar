'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { events, chat } from '@/lib/api';
import { wsClient } from '@/lib/ws';
import { useViewerStore } from '@/stores/viewerStore';
import { VideoPlayer } from '@/components/viewer/VideoPlayer';
import { ChatPanel } from '@/components/viewer/ChatPanel';
import { OffersPanel } from '@/components/viewer/OffersPanel';
import { SoundEffectPlayer } from '@/components/viewer/SoundEffectPlayer';
import { Users, Share2, Link as LinkIcon, FileText } from 'lucide-react';

interface EventData {
  id: string;
  title: string;
  description?: string;
  status: string;
  host: { id: string; displayName: string; avatarUrl?: string };
  playbackUrl?: string;
  thumbnailUrl?: string;
  chatEnabled: boolean;
  offersEnabled: boolean;
  scheduledStart?: string;
  viewerCount: number;
}

export default function ViewerPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    viewerCount,
    setEvent,
    setViewerCount,
    setMessages,
    addMessage,
    deleteMessage,
    setPinnedMessage,
    addTimelineEvent,
    setActiveOffer,
    updateOfferQuantity,
    setPresentation,
    setSlide,
    setLayoutMode,
    setOverlay,
    layoutMode,
    currentSlide,
    currentPresentation,
  } = useViewerStore();

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const data = await events.getViewer(slug) as EventData;
        setEventData(data);
        setEvent(data.id, data.title, data.status, data.playbackUrl || null);
        setViewerCount(data.viewerCount);
        setLoading(false);

        // Load initial chat messages
        if (data.chatEnabled) {
          try {
            const chatData = await chat.list(data.id, 50) as Array<{
              id: string;
              content: string;
              user: { id: string; displayName: string; avatarUrl?: string; role: string };
              timestampMs: number;
              createdAt: string;
            }>;
            // Reverse to get oldest first for chronological display
            setMessages(chatData.map(m => ({ ...m, createdAt: new Date(m.createdAt) })).reverse());

            // Load pinned message
            const pinned = await chat.getPinned(data.id) as {
              id: string;
              content: string;
              user: { id: string; displayName: string; avatarUrl?: string; role: string };
              timestampMs: number;
              createdAt: string;
            } | null;
            if (pinned) {
              setPinnedMessage({ ...pinned, createdAt: new Date(pinned.createdAt) });
            }
          } catch (chatErr) {
            console.error('Failed to load chat:', chatErr);
          }
        }

        // Connect to WebSocket
        const token = localStorage.getItem('accessToken');
        wsClient.connect(data.id, token || undefined);
      } catch (err) {
        setError('Event not found');
        setLoading(false);
      }
    };

    loadEvent();

    return () => {
      wsClient.disconnect();
    };
  }, [slug, setEvent, setViewerCount, setMessages, setPinnedMessage]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!eventData) return;

    const unsubscribers = [
      wsClient.on('viewer_count', (msg) => {
        const data = msg.data as { count: number };
        setViewerCount(data.count);
      }),

      wsClient.on('chat_message', (msg) => {
        const data = msg.data as {
          id: string;
          content: string;
          user: { id: string; displayName: string; avatarUrl?: string; role: string };
          timestampMs: number;
          createdAt: Date;
        };
        addMessage(data);
      }),

      wsClient.on('chat_delete', (msg) => {
        const data = msg.data as { messageId: string };
        deleteMessage(data.messageId);
      }),

      wsClient.on('chat_pin', (msg) => {
        const data = msg.data as { action: string; message?: unknown };
        if (data.action === 'pin' && data.message) {
          setPinnedMessage(data.message as Parameters<typeof setPinnedMessage>[0]);
        } else {
          setPinnedMessage(null);
        }
      }),

      wsClient.on('timeline_event', (msg) => {
        const event = msg.data as { id: string; type: string; payload: Record<string, unknown>; timestampMs: number };
        addTimelineEvent(event);
        handleTimelineEvent(event);
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [eventData]);

  const handleTimelineEvent = (event: { type: string; payload: Record<string, unknown> }) => {
    switch (event.type) {
      case 'OFFER_OPEN': {
        const payload = event.payload as {
          offerId: string;
          title: string;
          description?: string;
          price: number;
          originalPrice?: number;
          discountPercent?: number;
          quantityLimit?: number;
          quantityRemaining?: number;
          timeLimitSeconds?: number;
          product: { id: string; name: string; imageUrl?: string };
        };
        setActiveOffer({
          id: payload.offerId,
          title: payload.title,
          description: payload.description,
          price: payload.price,
          originalPrice: payload.originalPrice,
          discountPercent: payload.discountPercent,
          quantityLimit: payload.quantityLimit,
          quantityRemaining: payload.quantityRemaining,
          timeLimitSeconds: payload.timeLimitSeconds,
          expiresAt: payload.timeLimitSeconds
            ? new Date(Date.now() + payload.timeLimitSeconds * 1000)
            : undefined,
          product: payload.product,
        });
        break;
      }

      case 'OFFER_CLOSE':
        setActiveOffer(null);
        break;

      case 'LINK_DROP':
      case 'FILE_DROP':
        setOverlay({ type: event.type, data: event.payload });
        setTimeout(() => setOverlay(null), 10000);
        break;

      case 'PRESENTATION_START': {
        const payload = event.payload as {
          presentationId: string;
          title: string;
          totalSlides: number;
          initialSlideIndex: number;
          initialSlide: { id: string; type: string; contentUrl?: string; title?: string };
        };
        setPresentation({
          id: payload.presentationId,
          title: payload.title,
          totalSlides: payload.totalSlides,
        });
        setSlide(payload.initialSlide, payload.initialSlideIndex);
        setLayoutMode('slides_main');
        break;
      }

      case 'PRESENTATION_END':
        setPresentation(null);
        setSlide(null, 0);
        setLayoutMode('video_only');
        break;

      case 'SLIDE_CHANGE': {
        const payload = event.payload as {
          slideIndex: number;
          slide: { id: string; type: string; contentUrl?: string; title?: string };
        };
        setSlide(payload.slide, payload.slideIndex);
        break;
      }

      case 'LAYOUT_CHANGE': {
        const payload = event.payload as { mode: Parameters<typeof setLayoutMode>[0] };
        setLayoutMode(payload.mode);
        break;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
          <p className="text-gray-400">The event you're looking for doesn't exist or has ended.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 px-3 sm:px-4 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-bold text-white truncate">{eventData.title}</h1>
            <p className="text-xs sm:text-sm text-gray-400 truncate">Hosted by {eventData.host.displayName}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 text-gray-400 text-sm">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{viewerCount.toLocaleString()}</span>
            </div>
            <button className="flex items-center gap-1 sm:gap-2 text-gray-300 hover:text-white p-1">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline text-sm">Share</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4">
          {/* Video and slides */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
              {layoutMode === 'video_only' && (
                <VideoPlayer
                  src={eventData.playbackUrl || null}
                  poster={eventData.thumbnailUrl}
                  className="w-full h-full"
                />
              )}

              {layoutMode === 'slides_main' && currentSlide && (
                <>
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <img
                      src={currentSlide.contentUrl}
                      alt={currentSlide.title || 'Slide'}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="pip-video bottom-right">
                    <VideoPlayer
                      src={eventData.playbackUrl || null}
                      muted
                      className="w-full h-full"
                    />
                  </div>
                </>
              )}

              {layoutMode === 'side_by_side' && currentSlide && (
                <div className="flex h-full">
                  <div className="w-1/2 h-full">
                    <VideoPlayer
                      src={eventData.playbackUrl || null}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="w-1/2 h-full flex items-center justify-center bg-gray-900">
                    <img
                      src={currentSlide.contentUrl}
                      alt={currentSlide.title || 'Slide'}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Slide counter */}
              {currentPresentation && (
                <div className="absolute bottom-4 left-4 bg-black/70 text-white text-sm px-3 py-1 rounded-full">
                  Slide {useViewerStore.getState().currentSlideIndex + 1} / {currentPresentation.totalSlides}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Offers */}
            {eventData.offersEnabled && <OffersPanel />}

            {/* Resources */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Resources</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg p-2 transition-colors">
                  <LinkIcon className="w-4 h-4" />
                  <span>Links</span>
                </button>
                <button className="w-full flex items-center gap-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg p-2 transition-colors">
                  <FileText className="w-4 h-4" />
                  <span>Files</span>
                </button>
              </div>
            </div>

            {/* Chat */}
            {eventData.chatEnabled && (
              <div className="h-96">
                <ChatPanel />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sound Effect Player */}
      <SoundEffectPlayer eventId={eventData.id} />
    </div>
  );
}
