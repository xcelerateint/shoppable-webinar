import { PrismaClient } from '@prisma/client';

interface AnalyticsJobData {
  type: 'event_summary' | 'referral_payout';
  eventId?: string;
  date?: string;
}

export async function analyticsProcessor(
  data: AnalyticsJobData,
  prisma: PrismaClient
): Promise<void> {
  console.log('Processing analytics job:', data);

  const { type, eventId } = data;

  switch (type) {
    case 'event_summary': {
      if (!eventId) break;

      // Calculate event statistics
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          offers: true,
          orders: { where: { status: 'paid' } },
          chatMessages: true,
        },
      });

      if (!event) break;

      const totalRevenue = event.orders.reduce(
        (sum, order) => sum + Number(order.amount),
        0
      );

      const stats = {
        eventId,
        totalOffers: event.offers.length,
        totalOrders: event.orders.length,
        totalRevenue,
        totalMessages: event.chatMessages.length,
        averageOrderValue: event.orders.length > 0 ? totalRevenue / event.orders.length : 0,
      };

      console.log('Event summary:', stats);

      // In production, store these stats in an analytics table or send to analytics service
      break;
    }

    case 'referral_payout': {
      // Calculate and process referral payouts
      const referrals = await prisma.referral.findMany({
        where: {
          revenueGenerated: { gt: 0 },
        },
        include: {
          referrer: true,
        },
      });

      for (const referral of referrals) {
        const commission = Number(referral.revenueGenerated) * Number(referral.commissionRate);
        console.log(
          `Referrer ${referral.referrer.displayName} earned $${commission.toFixed(2)} commission`
        );
        // In production, trigger payout process
      }
      break;
    }
  }
}
