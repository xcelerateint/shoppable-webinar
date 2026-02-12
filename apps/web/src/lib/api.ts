const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  register: (email: string, password: string, displayName: string) =>
    request<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
    }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    }),

  getMe: () => request('/auth/me'),
};

// Events
export const events = {
  list: () => request('/events'),
  listLive: () => request('/events/live'),
  get: (id: string) => request(`/events/${id}`),
  getViewer: (slug: string) => request(`/events/${slug}/viewer`),
  create: (data: { title: string; description?: string; scheduledStart?: string }) =>
    request('/events', { method: 'POST', body: data }),
  update: (id: string, data: Record<string, unknown>) =>
    request(`/events/${id}`, { method: 'PATCH', body: data }),
  publish: (id: string) => request(`/events/${id}/publish`, { method: 'POST' }),
  goLive: (id: string) => request(`/events/${id}/go-live`, { method: 'POST' }),
  end: (id: string) => request(`/events/${id}/end`, { method: 'POST' }),
  getStreamKey: (id: string) => request(`/events/${id}/stream-key`),
  getReplay: (id: string) => request(`/events/${id}/replay`),
  getTimeline: (id: string) => request(`/events/${id}/timeline`),
  myEvents: () => request('/events/my-events'),
};

// Offers
export const offers = {
  list: (eventId: string) => request(`/events/${eventId}/offers`),
  getActive: (eventId: string) => request(`/events/${eventId}/offers/active`),
  create: (eventId: string, data: Record<string, unknown>) =>
    request(`/events/${eventId}/offers`, { method: 'POST', body: data }),
  open: (offerId: string, idempotencyKey: string) =>
    request(`/offers/${offerId}/open`, { method: 'POST', body: { idempotencyKey } }),
  close: (offerId: string, idempotencyKey: string) =>
    request(`/offers/${offerId}/close`, { method: 'POST', body: { idempotencyKey } }),
};

// Orders
export const orders = {
  createCheckoutSession: (offerId: string, eventId: string, referralCode?: string) =>
    request<{ checkoutSessionId: string; checkoutUrl: string }>('/checkout/session', {
      method: 'POST',
      body: { offerId, eventId, referralCode },
    }),
  getSessionStatus: (sessionId: string) => request(`/checkout/session/${sessionId}`),
  myOrders: () => request('/orders'),
};

// Chat
export const chat = {
  list: (eventId: string, limit?: number) =>
    request(`/events/${eventId}/chat${limit ? `?limit=${limit}` : ''}`),
  send: (eventId: string, content: string, idempotencyKey: string) =>
    request(`/events/${eventId}/chat`, {
      method: 'POST',
      body: { content, idempotencyKey },
    }),
  delete: (eventId: string, messageId: string, reason?: string) =>
    request(`/events/${eventId}/chat/${messageId}`, { method: 'DELETE', body: { reason: reason || 'Moderation' } }),
  pin: (eventId: string, messageId: string) =>
    request(`/events/${eventId}/chat/${messageId}/pin`, { method: 'POST' }),
  unpin: (eventId: string, messageId: string) =>
    request(`/events/${eventId}/chat/${messageId}/pin`, { method: 'DELETE' }),
  getPinned: (eventId: string) => request(`/events/${eventId}/chat/pinned`),
};

// Presentations
export const presentations = {
  list: (eventId: string) => request(`/events/${eventId}/presentations`),
  create: (eventId: string, title: string) =>
    request(`/events/${eventId}/presentations`, { method: 'POST', body: { title } }),
  start: (eventId: string, presentationId: string, idempotencyKey: string) =>
    request(`/events/${eventId}/presentation/start`, {
      method: 'POST',
      body: { presentationId, idempotencyKey },
    }),
  stop: (eventId: string, idempotencyKey: string) =>
    request(`/events/${eventId}/presentation/stop`, {
      method: 'POST',
      body: { idempotencyKey },
    }),
  goToSlide: (eventId: string, presentationId: string, slideIndex: number, idempotencyKey: string) =>
    request(`/events/${eventId}/slide/goto`, {
      method: 'POST',
      body: { presentationId, slideIndex, idempotencyKey },
    }),
  changeLayout: (eventId: string, mode: string, idempotencyKey: string) =>
    request(`/events/${eventId}/layout`, {
      method: 'POST',
      body: { mode, idempotencyKey },
    }),
};

// Referrals
export const referrals = {
  create: (eventId: string) => request(`/events/${eventId}/referrals`, { method: 'POST' }),
  get: (code: string) => request(`/referrals/${code}`),
  myStats: () => request('/users/me/referrals'),
};

// Assets
export const assets = {
  list: (eventId: string) => request(`/events/${eventId}/assets`),
  dropLink: (eventId: string, data: Record<string, unknown>) =>
    request(`/events/${eventId}/drops/link`, { method: 'POST', body: data }),
  dropFile: (eventId: string, assetId: string, idempotencyKey: string) =>
    request(`/events/${eventId}/drops/file`, { method: 'POST', body: { assetId, idempotencyKey } }),
  getDownloadUrl: (eventId: string, assetId: string) =>
    request(`/events/${eventId}/assets/${assetId}/download`),
};

export default {
  auth,
  events,
  offers,
  orders,
  chat,
  presentations,
  referrals,
  assets,
};
