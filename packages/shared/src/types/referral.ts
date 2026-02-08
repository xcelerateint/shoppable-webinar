export interface Referral {
  id: string;
  eventId: string;
  referrerId: string;
  code: string;
  clicks: number;
  conversions: number;
  revenueGenerated: number;
  commissionRate: number;
  createdAt: Date;
}

export type ReferralAttributionType = 'click' | 'signup' | 'purchase';

export interface ReferralAttribution {
  id: string;
  referralId: string;
  userId: string;
  orderId?: string;
  type: ReferralAttributionType;
  createdAt: Date;
}

export interface CreateReferralRequest {
  eventId: string;
}

export interface ReferralStats {
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommission: number;
  referrals: Referral[];
}

export interface ReferralInfo {
  code: string;
  eventId: string;
  eventTitle: string;
  referrerName: string;
}
