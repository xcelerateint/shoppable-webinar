'use client';

import { useState, useEffect } from 'react';
import { useViewerStore } from '@/stores/viewerStore';
import { orders } from '@/lib/api';
import { Clock, ShoppingCart, Loader2 } from 'lucide-react';
import { formatCurrency } from '@shoppable-webinar/shared';

export function OffersPanel() {
  const { activeOffer, eventId } = useViewerStore();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeOffer?.expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(activeOffer.expiresAt!).getTime() - Date.now()) / 1000)
      );
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeOffer?.expiresAt]);

  const handleBuyNow = async () => {
    if (!activeOffer || !eventId) return;

    setIsLoading(true);
    try {
      const { checkoutUrl } = await orders.createCheckoutSession(
        activeOffer.id,
        eventId,
        undefined // referralCode
      );
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeOffer) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2">Offers</h3>
        <p className="text-gray-400 text-sm">No active offers right now. Stay tuned!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden offer-card">
      {/* Offer header */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-600 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <span className="font-bold text-white">Flash Deal!</span>
        </div>
      </div>

      {/* Product info */}
      <div className="p-4">
        {activeOffer.product.imageUrl && (
          <img
            src={activeOffer.product.imageUrl}
            alt={activeOffer.product.name}
            className="w-full h-32 object-cover rounded-lg mb-3"
          />
        )}

        <h4 className="text-lg font-semibold text-white mb-1">{activeOffer.title}</h4>
        {activeOffer.description && (
          <p className="text-sm text-gray-400 mb-3">{activeOffer.description}</p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-white">
            {formatCurrency(activeOffer.price)}
          </span>
          {activeOffer.originalPrice && (
            <>
              <span className="text-lg text-gray-500 line-through">
                {formatCurrency(activeOffer.originalPrice)}
              </span>
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                {activeOffer.discountPercent}% OFF
              </span>
            </>
          )}
        </div>

        {/* Timer and quantity */}
        <div className="flex items-center justify-between text-sm mb-4">
          {timeRemaining !== null && (
            <div className="flex items-center gap-1 text-orange-400">
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeRemaining)}</span>
            </div>
          )}
          {activeOffer.quantityRemaining !== undefined && (
            <div className="text-gray-400">
              {activeOffer.quantityRemaining} left
            </div>
          )}
        </div>

        {/* Buy button */}
        <button
          onClick={handleBuyNow}
          disabled={isLoading || (activeOffer.quantityRemaining !== undefined && activeOffer.quantityRemaining <= 0)}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              Buy Now
            </>
          )}
        </button>
      </div>
    </div>
  );
}
