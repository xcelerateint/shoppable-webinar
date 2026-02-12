'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { SoundBoard } from '@/components/host/SoundBoard';
import { ViewerPanel } from '@/components/host/ViewerPanel';
import { ChatModeration } from '@/components/host/ChatModeration';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Smile,
  Maximize,
  Users,
  MessageCircle,
  Share2,
  Circle,
  MoreHorizontal,
  Settings,
  LayoutGrid,
  Clock,
  ChevronLeft,
  Volume2,
  Link as LinkIcon,
  Gift,
} from 'lucide-react';

interface EventData {
  id: string;
  title: string;
  slug: string;
  status: string;
  streamKey: string;
  playbackUrl: string;
}

export default function BroadcastPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<'idle' | 'connecting' | 'live'>('idle');
  const [testStreamRunning, setTestStreamRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'participants' | 'chat' | 'sounds' | 'offers'>('participants');

  // Controls state
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchEvent();
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [eventId]);

  useEffect(() => {
    if (streamStatus === 'live' || testStreamRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [streamStatus, testStreamRunning]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchEvent = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        // Auto-start camera preview
        startCamera();
      } else {
        setError('Failed to load event');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micEnabled;
      });
      setMicEnabled(!micEnabled);
    }
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const startTestStream = async () => {
    try {
      setStreamStatus('connecting');
      setError(null);
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      if (event?.status === 'scheduled') {
        await fetch(`${apiUrl}/api/events/${eventId}/go-live`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const res = await fetch(`${apiUrl}/api/events/${eventId}/test-stream`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setTestStreamRunning(true);
        setStreamStatus('live');
        fetchEvent();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to start stream');
        setStreamStatus('idle');
      }
    } catch (err) {
      setError('Failed to connect to server');
      setStreamStatus('idle');
    }
  };

  const stopTestStream = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${apiUrl}/api/events/${eventId}/stop-test-stream`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setTestStreamRunning(false);
      setStreamStatus('idle');
    } catch (err) {
      console.error('Failed to stop stream:', err);
    }
  };

  const endStream = async () => {
    if (confirm('Are you sure you want to end this broadcast?')) {
      await stopTestStream();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isLive = streamStatus === 'live' || testStreamRunning;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Back */}
        <div className="p-4 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5" />
            <Image src="/fflowcast-logo.png" alt="FFLOW CAST" width={32} height={32} className="rounded" />
            <span className="font-semibold text-gray-900">FFLOW CAST</span>
          </Link>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
              H
            </div>
            <div>
              <p className="font-medium text-gray-900">Host</p>
              <p className="text-xs text-gray-500">Presenter</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Broadcast</p>
          <ul className="space-y-1">
            <li>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-medium">
                <Video className="w-5 h-5" />
                Live Studio
              </button>
            </li>
            <li>
              <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
                <LayoutGrid className="w-5 h-5" />
                Dashboard
              </Link>
            </li>
            <li>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
                <Settings className="w-5 h-5" />
                Settings
              </button>
            </li>
          </ul>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6">Quick Actions</p>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setActiveTab('offers')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <Gift className="w-5 h-5" />
                Drop Offer
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
                <LinkIcon className="w-5 h-5" />
                Drop Link
              </button>
            </li>
          </ul>
        </nav>

        {/* Stream Status */}
        <div className="p-4 border-t border-gray-100">
          <div className={`px-3 py-2 rounded-lg ${isLive ? 'bg-red-50' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className={`text-sm font-medium ${isLive ? 'text-red-700' : 'text-gray-600'}`}>
                {isLive ? 'LIVE' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{event?.title}</h1>
                {isLive && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
              </div>
              {event && (
                <Link
                  href={`/e/${event.slug || event.id}`}
                  target="_blank"
                  className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  View as Viewer →
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Video Area */}
        <div className="flex-1 p-6 flex gap-6">
          {/* Video + Controls */}
          <div className="flex-1 flex flex-col">
            {/* Video Container */}
            <div className="flex-1 bg-gray-900 rounded-2xl overflow-hidden relative shadow-xl">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`}
              />
              {!videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                    H
                  </div>
                </div>
              )}

              {/* You label */}
              <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
                You
              </div>

              {/* Live indicator */}
              {isLive && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-red-600 rounded-full text-white text-sm font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              )}
            </div>

            {/* Video Controls */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={toggleMic}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  micEnabled ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  videoEnabled ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              {isLive ? (
                <button
                  onClick={endStream}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition shadow-lg"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={startTestStream}
                  disabled={streamStatus === 'connecting'}
                  className="px-6 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 transition shadow-lg disabled:opacity-50"
                >
                  {streamStatus === 'connecting' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Circle className="w-5 h-5 fill-current" />
                      <span className="font-semibold">Go Live</span>
                    </>
                  )}
                </button>
              )}

              <button className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition">
                <Smile className="w-5 h-5" />
              </button>

              <button className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition">
                <Maximize className="w-5 h-5" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setActiveTab('participants')}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition ${
                  activeTab === 'participants' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-xs font-medium">Viewers</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition ${
                  activeTab === 'chat' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs font-medium">Chat</span>
              </button>

              <button
                onClick={() => setActiveTab('sounds')}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition ${
                  activeTab === 'sounds' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Volume2 className="w-5 h-5" />
                <span className="text-xs font-medium">Sounds</span>
              </button>

              <button className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition">
                <Share2 className="w-5 h-5" />
                <span className="text-xs font-medium">Share</span>
              </button>

              <button className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition">
                <Circle className="w-5 h-5" />
                <span className="text-xs font-medium">Record</span>
              </button>

              <button className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition">
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-xs font-medium">More</span>
              </button>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Sidebar Panel */}
          <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 capitalize">
                {activeTab === 'participants' && 'Viewers'}
                {activeTab === 'chat' && 'Live Chat'}
                {activeTab === 'sounds' && 'Sound Effects'}
                {activeTab === 'offers' && 'Offers'}
              </h3>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'participants' && event && (
                <ViewerPanel eventId={event.id} />
              )}
              {activeTab === 'chat' && event && (
                <ChatModeration eventId={event.id} />
              )}
              {activeTab === 'sounds' && event && (
                <SoundBoard eventId={event.id} disabled={!isLive} />
              )}
              {activeTab === 'offers' && (
                <div className="p-4 text-center text-gray-500">
                  <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Create and launch offers during your broadcast</p>
                  <button className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                    Create Offer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
