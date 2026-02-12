'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  description: string;
  slug: string;
  status: string;
  scheduledStart: string | null;
  thumbnailUrl: string | null;
  host: {
    displayName: string;
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const liveEvents = events.filter((e) => e.status === 'live');
  const upcomingEvents = events.filter((e) => e.status === 'scheduled');

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            Shoppable Webinar
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-gray-300 hover:text-white">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Browse Events</h1>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading events...</div>
        ) : (
          <>
            {/* Live Events */}
            {liveEvents.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  Live Now
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveEvents.map((event) => (
                    <EventCard key={event.id} event={event} isLive />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xl font-semibold text-white mb-4">Upcoming</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {events.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-4">No events available yet.</p>
                <Link
                  href="/register"
                  className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg"
                >
                  Host Your First Event
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EventCard({ event, isLive }: { event: Event; isLive?: boolean }) {
  return (
    <Link
      href={`/e/${event.slug}`}
      className="bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all"
    >
      <div className="aspect-video bg-gray-700 relative">
        {event.thumbnailUrl ? (
          <img
            src={event.thumbnailUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {isLive && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            LIVE
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-1">{event.title}</h3>
        <p className="text-gray-400 text-sm mb-2">by {event.host.displayName}</p>
        {event.scheduledStart && !isLive && (
          <p className="text-gray-500 text-sm">
            {new Date(event.scheduledStart).toLocaleDateString()} at{' '}
            {new Date(event.scheduledStart).toLocaleTimeString()}
          </p>
        )}
      </div>
    </Link>
  );
}
