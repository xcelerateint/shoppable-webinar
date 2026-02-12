'use client';

import { useState, useEffect } from 'react';
import { Users, User, Clock } from 'lucide-react';
import { wsClient } from '@/lib/ws';

interface Viewer {
  odId?: string;
  displayName: string;
  joinedAt?: string;
  isAuthenticated: boolean;
}

interface ViewerPanelProps {
  eventId: string;
  refreshInterval?: number;
}

export function ViewerPanel({ eventId, refreshInterval = 10000 }: ViewerPanelProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchViewers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/events/${eventId}/viewers`, {
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

    // Connect to WebSocket for real-time viewer updates
    const token = localStorage.getItem('accessToken');
    if (!wsClient.isConnected()) {
      wsClient.connect(eventId, token || undefined);
    }
    wsClient.subscribeToHostChannel();

    // Listen for viewer count updates
    const unsubViewerCount = wsClient.on('viewer_count', (msg) => {
      const data = msg.data as { count: number };
      setCount(data.count);
    });

    // Listen for viewer join
    const unsubViewerJoin = wsClient.on('viewer_join', (msg) => {
      const data = msg.data as Viewer;
      setViewers(prev => {
        // Avoid duplicates
        if (prev.some(v => v.odId === data.odId && data.odId)) return prev;
        return [...prev, data];
      });
    });

    // Listen for viewer leave
    const unsubViewerLeave = wsClient.on('viewer_leave', (msg) => {
      const data = msg.data as { odId?: string; displayName?: string };
      setViewers(prev => prev.filter(v => {
        if (data.odId && v.odId === data.odId) return false;
        return true;
      }));
    });

    // Still poll less frequently as a fallback
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

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Viewers
        </h3>
        <span className="bg-primary-600 text-white text-sm font-bold px-3 py-1 rounded-full">
          {count}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : viewers.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">
          No viewers yet. Share your event link!
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {viewers.map((viewer, index) => (
            <div
              key={viewer.odId || index}
              className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  viewer.isAuthenticated ? 'bg-primary-600' : 'bg-gray-600'
                }`}>
                  {viewer.isAuthenticated ? (
                    viewer.displayName.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <span className="text-white text-sm truncate">
                  {viewer.displayName}
                </span>
              </div>
              {viewer.joinedAt && (
                <span className="text-gray-400 text-xs flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatJoinTime(viewer.joinedAt)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{viewers.filter(v => v.isAuthenticated).length} logged in</span>
          <span>{viewers.filter(v => !v.isAuthenticated).length} anonymous</span>
        </div>
      </div>
    </div>
  );
}
