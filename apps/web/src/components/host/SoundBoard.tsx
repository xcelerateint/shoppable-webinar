'use client';

import { useState, useRef } from 'react';
import { Volume2, DollarSign, Users, Sparkles, AlertCircle, Music, ThumbsUp, Award } from 'lucide-react';

interface SoundEffect {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// Better quality sound effect URLs from free sources
const SOUND_URLS: Record<string, string> = {
  applause: 'https://cdn.freesound.org/previews/140/140714_2433868-lq.mp3', // Real audience applause
  cheering: 'https://cdn.freesound.org/previews/213/213830_61963-lq.mp3', // Crowd cheering
  fireworks: 'https://cdn.freesound.org/previews/369/369920_2679618-lq.mp3', // Fireworks celebration
  alert: 'https://cdn.freesound.org/previews/352/352661_2542516-lq.mp3', // Attention alert
  drumroll: 'https://cdn.freesound.org/previews/177/177112_3306749-lq.mp3', // Drum roll suspense
  chaching: 'https://cdn.freesound.org/previews/131/131660_2337290-lq.mp3', // Cash register
  success: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3', // Success fanfare
  tada: 'https://cdn.freesound.org/previews/397/397355_4284968-lq.mp3', // Ta-da reveal
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
      await fetch(`http://localhost:4000/api/events/${eventId}/sound-effect`, {
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
