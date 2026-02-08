import { Product } from './product';

export type OfferStatus = 'pending' | 'active' | 'paused' | 'closed' | 'expired';

export interface Offer {
  id: string;
  eventId: string;
  productId: string;
  title: string;
  description?: string;
  offerPrice: number;
  originalPrice?: number;
  discountPercent?: number;
  quantityLimit?: number;
  quantityClaimed: number;
  timeLimitSeconds?: number;
  status: OfferStatus;
  openedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
}

export interface OfferWithProduct extends Offer {
  product: Product;
}

export interface CreateOfferRequest {
  productId: string;
  title: string;
  description?: string;
  offerPrice: number;
  originalPrice?: number;
  discountPercent?: number;
  quantityLimit?: number;
  timeLimitSeconds?: number;
}

export interface UpdateOfferRequest {
  title?: string;
  description?: string;
  offerPrice?: number;
  originalPrice?: number;
  discountPercent?: number;
  quantityLimit?: number;
  timeLimitSeconds?: number;
}

export interface OpenOfferRequest {
  idempotencyKey: string;
}

export interface CloseOfferRequest {
  idempotencyKey: string;
  reason?: 'manual' | 'sold_out' | 'expired';
}

export interface ActiveOffer extends OfferWithProduct {
  quantityRemaining: number;
  expiresAt?: Date;
}
