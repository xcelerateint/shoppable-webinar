'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Registration failed');
      }

      router.push('/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white">
            FFLOW CAST
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6">Create Account</h1>
          <p className="text-gray-400 mt-2">Start hosting live shopping events</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-500 hover:text-primary-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
