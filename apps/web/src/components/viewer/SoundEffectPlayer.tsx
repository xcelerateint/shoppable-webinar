'use client';

import { useEffect, useRef, useState } from 'react';
import { wsClient } from '@/lib/ws';

// Sound effect URLs - local files in /public/sounds/ or Mixkit CDN
const SOUND_URLS: Record<string, string> = {
  applause: '/sounds/applause.mp3',
  cheering: 'https://assets.mixkit.co/active_storage/sfx/2193/2193-preview.mp3',
  fireworks: 'https://assets.mixkit.co/active_storage/sfx/1461/1461-preview.mp3',
  alert: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  drumroll: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  chaching: 'https://assets.mixkit.co/active_storage/sfx/2954/2954-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3',
  tada: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
};

const SOUND_LABELS: Record<string, string> = {
  applause: 'Applause',
  cheering: 'Cheering',
  fireworks: 'Celebration',
  alert: 'Alert',
  drumroll: 'Drum Roll',
  chaching: 'Sale!',
  success: 'Success',
  tada: 'Ta-Da!',
};

interface SoundEffectPlayerProps {
  eventId: string;
}

export function SoundEffectPlayer({ eventId }: SoundEffectPlayerProps) {
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Listen for sound effects from the existing WebSocket connection
    const unsubscribe = wsClient.on('sound_effect', (msg) => {
      const data = msg.data as { soundId: string };
      if (data?.soundId) {
        playSound(data.soundId);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [eventId]);

  const playSound = (soundId: string) => {
    const url = SOUND_URLS[soundId];
    if (!url) return;

    // Show emoji animation
    setCurrentEffect(soundId);
    setShowEmoji(true);

    // Play audio
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.volume = 0.7;
      audioRef.current.play().catch(err => {
        console.log('Audio autoplay blocked:', err);
      });
    }

    // Hide emoji after animation
    setTimeout(() => {
      setShowEmoji(false);
      setCurrentEffect(null);
    }, 2000);
  };

  return (
    <>
      <audio ref={audioRef} />

      {/* Clean notification overlay */}
      {showEmoji && currentEffect && (
        <div className="fixed top-4 right-4 z-50 pointer-events-none">
          <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-3 shadow-xl animate-slide-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
              <span className="text-white font-medium">{SOUND_LABELS[currentEffect] || 'Sound Effect'}</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
