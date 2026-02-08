export type OrderStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  eventId?: string;
  offerId?: string;
  productId?: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  referralId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  type: string;
  payload: Record<string, unknown>;
  source: string;
  createdAt: Date;
}

export interface CreateCheckoutSessionRequest {
  offerId: string;
  eventId: string;
  referralCode?: string;
}

export interface CheckoutSessionResponse {
  checkoutSessionId: string;
  checkoutUrl: string;
}

export interface OrderWithDetails extends Order {
  offer?: {
    id: string;
    title: string;
    offerPrice: number;
  };
  product?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  event?: {
    id: string;
    title: string;
  };
}
