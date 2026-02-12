'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { events as eventsApi } from '@/lib/api';
import { Plus, Video, Calendar, BarChart3 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  slug: string;
  status: string;
  scheduledStart?: string;
  thumbnailUrl?: string;
}

export default function DashboardPage() {
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await eventsApi.myEvents() as Event[];
        setMyEvents(data);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      draft: { bg: 'bg-gray-500', text: 'Draft' },
      scheduled: { bg: 'bg-blue-500', text: 'Scheduled' },
      live: { bg: 'bg-red-500', text: 'Live' },
      ended: { bg: 'bg-gray-500', text: 'Ended' },
      archived: { bg: 'bg-gray-600', text: 'Archived' },
    };
    const badge = badges[status] || badges.draft;
    return (
      <span className={`${badge.bg} text-white text-xs px-2 py-0.5 rounded`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Host Dashboard</h1>
          <Link
            href="/events/new"
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Event
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Events</p>
                <p className="text-2xl font-bold text-white">{myEvents.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Upcoming</p>
                <p className="text-2xl font-bold text-white">
                  {myEvents.filter((e) => e.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Live Now</p>
                <p className="text-2xl font-bold text-white">
                  {myEvents.filter((e) => e.status === 'live').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Events list */}
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Your Events</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : myEvents.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 mb-4">You haven't created any events yet.</p>
              <Link
                href="/events/new"
                className="text-primary-400 hover:underline"
              >
                Create your first event
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {myEvents.map((event) => (
                <div
                  key={event.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-10 bg-gray-700 rounded overflow-hidden">
                      {event.thumbnailUrl && (
                        <img
                          src={event.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{event.title}</h3>
                      <p className="text-sm text-gray-400">
                        {event.scheduledStart
                          ? new Date(event.scheduledStart).toLocaleDateString()
                          : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(event.status)}
                    {event.status === 'live' && (
                      <Link
                        href={`/events/${event.id}/broadcast`}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded text-sm"
                      >
                        Control Stream
                      </Link>
                    )}
                    {event.status === 'scheduled' && (
                      <Link
                        href={`/events/${event.id}/broadcast`}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded text-sm"
                      >
                        Go Live
                      </Link>
                    )}
                    {event.status === 'draft' && (
                      <Link
                        href={`/events/${event.id}/edit`}
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
