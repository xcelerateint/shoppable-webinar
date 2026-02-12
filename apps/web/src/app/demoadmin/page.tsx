'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
  Search,
  Send,
  User,
  DollarSign,
  Sparkles,
  AlertCircle,
  Music,
  ThumbsUp,
  Award,
  Pin,
  Trash2,
} from 'lucide-react';

// Mock data
const MOCK_VIEWERS = [
  { id: '1', name: 'Sarah M.', joinedAt: '2m ago' },
  { id: '2', name: 'John D.', joinedAt: '5m ago' },
  { id: '3', name: 'Emily R.', joinedAt: '8m ago' },
  { id: '4', name: 'Mike T.', joinedAt: '12m ago' },
  { id: '5', name: 'Lisa K.', joinedAt: '15m ago' },
  { id: '6', name: 'David W.', joinedAt: '18m ago' },
];

const MOCK_MESSAGES = [
  { id: '1', user: 'Sarah M.', content: 'This is amazing! 🔥', role: 'viewer' },
  { id: '2', user: 'Host', content: 'Welcome everyone to the show!', role: 'host' },
  { id: '3', user: 'John D.', content: 'When does the offer start?', role: 'viewer' },
  { id: '4', user: 'Emily R.', content: 'Love this product!', role: 'viewer' },
  { id: '5', user: 'Host', content: 'Flash deal coming in 2 minutes!', role: 'host' },
];

const SOUND_EFFECTS = [
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

const colors = [
  'from-pink-500 to-rose-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
];

export default function DemoAdminPage() {
  const [isLive, setIsLive] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(323); // 5:23
  const [activeTab, setActiveTab] = useState<'participants' | 'chat' | 'sounds' | 'offers'>('participants');
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [playingSound, setPlayingSound] = useState<string | null>(null);

  useEffect(() => {
    if (isLive) {
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLive]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playSound = (soundId: string) => {
    setPlayingSound(soundId);
    setTimeout(() => setPlayingSound(null), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Back */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-600">
            <ChevronLeft className="w-5 h-5" />
            <Image src="/fflowcast-logo.png" alt="FFLOW CAST" width={32} height={32} className="rounded" />
            <span className="font-semibold text-gray-900">FFLOW CAST</span>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
              H
            </div>
            <div>
              <p className="font-medium text-gray-900">Demo Host</p>
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
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100">
                <LayoutGrid className="w-5 h-5" />
                Dashboard
              </button>
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
                <h1 className="text-2xl font-bold text-gray-900">Summer Flash Sale Event</h1>
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
              <button className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                View as Viewer →
              </button>
            </div>
          </div>
        </header>

        {/* Video Area */}
        <div className="flex-1 p-6 flex gap-6">
          {/* Video + Controls */}
          <div className="flex-1 flex flex-col">
            {/* Video Container */}
            <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden relative shadow-xl min-h-[400px]">
              {/* Simulated video background */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800')] bg-cover bg-center opacity-90" />

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

              {/* Viewer count */}
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 rounded-full text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                {MOCK_VIEWERS.length} viewers
              </div>
            </div>

            {/* Video Controls */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  micEnabled ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  videoEnabled ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              {isLive ? (
                <button
                  onClick={() => setIsLive(false)}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition shadow-lg"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={() => setIsLive(true)}
                  className="px-6 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 transition shadow-lg"
                >
                  <Circle className="w-5 h-5 fill-current" />
                  <span className="font-semibold">Go Live</span>
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
          </div>

          {/* Right Sidebar Panel */}
          <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {activeTab === 'participants' && 'Viewers'}
                {activeTab === 'chat' && 'Live Chat'}
                {activeTab === 'sounds' && 'Sound Effects'}
                {activeTab === 'offers' && 'Offers'}
              </h3>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Viewers Tab */}
              {activeTab === 'participants' && (
                <div className="flex flex-col h-full">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Viewers</span>
                    <span className="bg-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1 rounded-full">
                      {MOCK_VIEWERS.length}
                    </span>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search viewers..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex-1 p-2">
                    <div className="grid grid-cols-2 gap-2">
                      {MOCK_VIEWERS.map((viewer, index) => (
                        <div key={viewer.id} className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center text-white font-semibold text-lg mb-2 shadow-sm`}>
                            {viewer.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate w-full text-center">
                            {viewer.name}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {viewer.joinedAt}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500"><span className="font-medium text-gray-700">5</span> logged in</span>
                      <span className="text-gray-500"><span className="font-medium text-gray-700">1</span> anonymous</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {MOCK_MESSAGES.map((msg) => (
                      <div key={msg.id} className={`group relative p-3 rounded-xl transition ${msg.role === 'host' ? 'bg-indigo-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${msg.role === 'host' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'}`}>
                            {msg.user.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">{msg.user}</span>
                              {msg.role === 'host' && (
                                <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">Host</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{msg.content}</p>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-lg bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm transition">
                            <Pin className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded-lg bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Send a message as host..."
                        className="flex-1 bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sounds Tab */}
              {activeTab === 'sounds' && (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {SOUND_EFFECTS.map((sound) => (
                      <button
                        key={sound.id}
                        onClick={() => playSound(sound.id)}
                        className={`${sound.color} p-3 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1.5 transition-all duration-150 ${playingSound === sound.id ? 'ring-2 ring-indigo-500 ring-offset-2 scale-95' : ''}`}
                      >
                        {sound.icon}
                        <span className="truncate">{sound.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Offers Tab */}
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
