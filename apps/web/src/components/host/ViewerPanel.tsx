'use client';

import { useState, useEffect } from 'react';
import { Users, User, Clock, Search } from 'lucide-react';
import { wsClient } from '@/lib/ws';

interface Viewer {
  odId?: string;
  displayName: string;
  joinedAt?: string;
  isAuthenticated: boolean;
  avatarUrl?: string;
}

interface ViewerPanelProps {
  eventId: string;
  refreshInterval?: number;
}

export function ViewerPanel({ eventId, refreshInterval = 10000 }: ViewerPanelProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchViewers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/events/${eventId}/viewers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setViewers(data.viewers || []);
        setCount(data.count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch viewers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViewers();

    const token = localStorage.getItem('accessToken');
    if (!wsClient.isConnected()) {
      wsClient.connect(eventId, token || undefined);
    }
    wsClient.subscribeToHostChannel();

    const unsubViewerCount = wsClient.on('viewer_count', (msg) => {
      const data = msg.data as { count: number };
      setCount(data.count);
    });

    const unsubViewerJoin = wsClient.on('viewer_join', (msg) => {
      const data = msg.data as Viewer;
      setViewers(prev => {
        if (prev.some(v => v.odId === data.odId && data.odId)) return prev;
        return [...prev, data];
      });
    });

    const unsubViewerLeave = wsClient.on('viewer_leave', (msg) => {
      const data = msg.data as { odId?: string; displayName?: string };
      setViewers(prev => prev.filter(v => {
        if (data.odId && v.odId === data.odId) return false;
        return true;
      }));
    });

    const interval = setInterval(fetchViewers, refreshInterval);

    return () => {
      clearInterval(interval);
      unsubViewerCount();
      unsubViewerJoin();
      unsubViewerLeave();
    };
  }, [eventId, refreshInterval]);

  const formatJoinTime = (joinedAt?: string) => {
    if (!joinedAt) return '';
    const date = new Date(joinedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  const filteredViewers = viewers.filter(v =>
    v.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const colors = [
    'from-pink-500 to-rose-500',
    'from-violet-500 to-purple-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
  ];

  const getColorForViewer = (index: number) => colors[index % colors.length];

  return (
    <div className="flex flex-col h-full">
      {/* Header with count */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Total Viewers</span>
        <span className="bg-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1 rounded-full">
          {count}
        </span>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search viewers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Viewers List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredViewers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {searchQuery ? 'No viewers found' : 'No viewers yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredViewers.map((viewer, index) => (
              <div
                key={viewer.odId || index}
                className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getColorForViewer(index)} flex items-center justify-center text-white font-semibold text-lg mb-2 shadow-sm`}>
                  {viewer.isAuthenticated ? (
                    viewer.displayName.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 truncate w-full text-center">
                  {viewer.displayName}
                </span>
                {viewer.joinedAt && (
                  <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatJoinTime(viewer.joinedAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            <span className="font-medium text-gray-700">{viewers.filter(v => v.isAuthenticated).length}</span> logged in
          </span>
          <span className="text-gray-500">
            <span className="font-medium text-gray-700">{viewers.filter(v => !v.isAuthenticated).length}</span> anonymous
          </span>
        </div>
      </div>
    </div>
  );
}
