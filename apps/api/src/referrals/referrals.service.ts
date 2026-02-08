import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { generateCode } from '@shoppable-webinar/shared';

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  async create(eventId: string, referrerId: string) {
    const code = generateCode(8);

    return this.prisma.referral.create({
      data: {
        eventId,
        referrerId,
        code,
      },
    });
  }

  async findByCode(code: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { code },
      include: {
        event: {
          select: { id: true, title: true },
        },
        referrer: {
          select: { displayName: true },
        },
      },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    return {
      code: referral.code,
      eventId: referral.event.id,
      eventTitle: referral.event.title,
      referrerName: referral.referrer.displayName,
    };
  }

  async trackClick(code: string, userId?: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { code },
    });

    if (!referral) return;

    await this.prisma.referral.update({
      where: { code },
      data: { clicks: { increment: 1 } },
    });

    if (userId) {
      await this.prisma.referralAttribution.create({
        data: {
          referralId: referral.id,
          userId,
          type: 'click',
        },
      });
    }
  }

  async findByUser(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        event: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totals = referrals.reduce(
      (acc, ref) => ({
        totalClicks: acc.totalClicks + ref.clicks,
        totalConversions: acc.totalConversions + ref.conversions,
        totalRevenue: acc.totalRevenue + Number(ref.revenueGenerated),
        totalCommission: acc.totalCommission + Number(ref.revenueGenerated) * Number(ref.commissionRate),
      }),
      { totalClicks: 0, totalConversions: 0, totalRevenue: 0, totalCommission: 0 },
    );

    return {
      ...totals,
      referrals,
    };
  }

  async findByEvent(eventId: string) {
    return this.prisma.referral.findMany({
      where: { eventId },
      include: {
        referrer: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { revenueGenerated: 'desc' },
    });
  }
}
