export interface Product {
  id: string;
  externalId?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  currency: string;
  inventoryCount?: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  externalId?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  currency?: string;
  inventoryCount?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
  basePrice?: number;
  inventoryCount?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}
