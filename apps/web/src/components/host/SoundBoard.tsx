'use client';

import { useState, useRef } from 'react';
import { Volume2, DollarSign, Users, Sparkles, AlertCircle, Music, ThumbsUp, Award } from 'lucide-react';

interface SoundEffect {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const SOUND_URLS: Record<string, string> = {
  applause: '/sounds/applause.mp3',
  cheering: 'https://assets.mixkit.co/active_storage/sfx/2193/2193-preview.mp3',
  fireworks: 'https://assets.mixkit.co/active_storage/sfx/1461/1461-preview.mp3',
  alert: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  drumroll: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  chaching: '/sounds/chaching.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3',
  tada: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  fail: '/sounds/fail.mp3',
};

const SOUND_EFFECTS: SoundEffect[] = [
  { id: 'applause', name: 'Applause', icon: <Users className="w-5 h-5" />, color: 'bg-pink-100 text-pink-600 hover:bg-pink-200' },
  { id: 'cheering', name: 'Cheering', icon: <ThumbsUp className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600 hover:bg-blue-200' },
  { id: 'chaching', name: 'Sale', icon: <DollarSign className="w-5 h-5" />, color: 'bg-green-100 text-green-600 hover:bg-green-200' },
  { id: 'tada', name: 'Reveal', icon: <Sparkles className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600 hover:bg-purple-200' },
  { id: 'drumroll', name: 'Suspense', icon: <Music className="w-5 h-5" />, color: 'bg-amber-100 text-amber-600 hover:bg-amber-200' },
  { id: 'success', name: 'Success', icon: <Award className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' },
  { id: 'alert', name: 'Alert', icon: <AlertCircle className="w-5 h-5" />, color: 'bg-red-100 text-red-600 hover:bg-red-200' },
  { id: 'fireworks', name: 'Celebrate', icon: <Sparkles className="w-5 h-5" />, color: 'bg-orange-100 text-orange-600 hover:bg-orange-200' },
  { id: 'fail', name: 'Fail', icon: <AlertCircle className="w-5 h-5" />, color: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
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

    const url = SOUND_URLS[soundId];
    if (url) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = url;
      audioRef.current.volume = 0.6;
      audioRef.current.play().catch(err => console.log('Audio play error:', err));
    }

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

    setTimeout(() => setPlaying(null), 2000);
  };

  return (
    <div className="p-4">
      {disabled && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          Go live to enable sound effects
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {SOUND_EFFECTS.map((sound) => (
          <button
            key={sound.id}
            onClick={() => playSound(sound.id)}
            disabled={disabled || playing !== null}
            title={sound.name}
            className={`
              ${sound.color}
              p-3 rounded-xl text-xs font-medium
              flex flex-col items-center justify-center gap-1.5
              transition-all duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
              ${playing === sound.id ? 'ring-2 ring-indigo-500 ring-offset-2 scale-95' : ''}
            `}
          >
            {sound.icon}
            <span className="truncate">{sound.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
