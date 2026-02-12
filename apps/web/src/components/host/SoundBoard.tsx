'use client';

import { useState, useRef } from 'react';
import { Volume2, DollarSign, Users, Sparkles, AlertCircle, Music, ThumbsUp, Award } from 'lucide-react';

interface SoundEffect {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// Sound effect URLs - local files in /public/sounds/ or Mixkit CDN
const SOUND_URLS: Record<string, string> = {
  applause: '/sounds/applause.mp3', // Local file
  cheering: 'https://assets.mixkit.co/active_storage/sfx/2193/2193-preview.mp3', // Crowd cheering
  fireworks: 'https://assets.mixkit.co/active_storage/sfx/1461/1461-preview.mp3', // Fireworks
  alert: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Alert notification
  drumroll: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Drum roll
  chaching: '/sounds/chaching.mp3', // Cash register
  success: 'https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3', // Success fanfare
  tada: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3', // Ta-da reveal
  fail: '/sounds/fail.mp3', // Fail trumpet
};

const SOUND_EFFECTS: SoundEffect[] = [
  { id: 'applause', name: 'Applause', icon: <Users className="w-4 h-4" /> },
  { id: 'cheering', name: 'Cheering', icon: <ThumbsUp className="w-4 h-4" /> },
  { id: 'chaching', name: 'Sale', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'tada', name: 'Reveal', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'drumroll', name: 'Suspense', icon: <Music className="w-4 h-4" /> },
  { id: 'success', name: 'Success', icon: <Award className="w-4 h-4" /> },
  { id: 'alert', name: 'Alert', icon: <AlertCircle className="w-4 h-4" /> },
  { id: 'fireworks', name: 'Celebrate', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'fail', name: 'Fail', icon: <AlertCircle className="w-4 h-4" /> },
];

interface SoundBoardProps {
  eventId: string;
  disabled?: boolean;
}

export function SoundBoard({ eventId, disabled }: SoundBoardProps) {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = async (soundId: string) => {
    if (disabled || playing) return;

    setPlaying(soundId);

    // Play sound locally for host feedback
    const url = SOUND_URLS[soundId];
    if (url) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = url;
      audioRef.current.volume = 0.6;
      audioRef.current.play().catch(err => console.log('Audio play error:', err));
    }

    // Send to viewers via API
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiUrl}/api/events/${eventId}/sound-effect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ soundId }),
      });
    } catch (err) {
      console.error('Failed to trigger sound:', err);
    }

    // Reset after sound duration
    setTimeout(() => setPlaying(null), 2000);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
          <Volume2 className="w-4 h-4" />
          Sound Effects
        </h3>
        {disabled && (
          <span className="text-xs text-gray-500">Go live to enable</span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {SOUND_EFFECTS.map((sound) => (
          <button
            key={sound.id}
            onClick={() => playSound(sound.id)}
            disabled={disabled || playing !== null}
            title={sound.name}
            className={`
              bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white
              px-2 py-1.5 rounded text-xs font-medium
              flex items-center justify-center gap-1
              transition-all duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
              ${playing === sound.id ? 'bg-primary-600 text-white ring-1 ring-primary-400' : ''}
            `}
          >
            {sound.icon}
            <span className="hidden sm:inline truncate">{sound.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
