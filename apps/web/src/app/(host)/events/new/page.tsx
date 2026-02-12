'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledStart: '',
    isPublic: true,
    chatEnabled: true,
    offersEnabled: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');

      // Create the event
      const createRes = await fetch('http://localhost:4000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          scheduledStart: formData.scheduledStart || undefined,
          isPublic: formData.isPublic,
          chatEnabled: formData.chatEnabled,
          offersEnabled: formData.offersEnabled,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.message || 'Failed to create event');
      }

      const event = await createRes.json();

      // Publish the event to get stream key
      const publishRes = await fetch(`http://localhost:4000/api/events/${event.id}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!publishRes.ok) {
        const data = await publishRes.json();
        throw new Error(data.message || 'Failed to publish event');
      }

      // Redirect to broadcast page
      router.push(`/events/${event.id}/broadcast`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-white">Create New Event</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white">Event Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="My Awesome Live Event"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Tell viewers what your event is about..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Scheduled Start (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledStart}
                onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-gray-500 text-sm mt-1">
                Leave empty to go live immediately
              </p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Settings</h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <span className="text-white">Public Event</span>
                <p className="text-gray-500 text-sm">Anyone can view this event</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.chatEnabled}
                onChange={(e) => setFormData({ ...formData, chatEnabled: e.target.checked })}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <span className="text-white">Enable Chat</span>
                <p className="text-gray-500 text-sm">Allow viewers to chat during the event</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.offersEnabled}
                onChange={(e) => setFormData({ ...formData, offersEnabled: e.target.checked })}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <span className="text-white">Enable Offers</span>
                <p className="text-gray-500 text-sm">Show product offers during the event</p>
              </div>
            </label>
          </div>

          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.title}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create & Go Live'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
