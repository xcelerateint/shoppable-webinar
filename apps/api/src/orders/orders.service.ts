import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { OffersService } from '../offers/offers.service';
import { UsersService } from '../users/users.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { CreateCheckoutSessionDto } from './dto/order.dto';
import Stripe from 'stripe';

@Injectable()
export class OrdersService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => OffersService))
    private offersService: OffersService,
    private usersService: UsersService,
    @Inject(forwardRef(() => WebsocketGateway))
    private wsGateway: WebsocketGateway,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeKey || 'sk_test_xxx', {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(userId: string, dto: CreateCheckoutSessionDto) {
    const offer = await this.offersService.findById(dto.offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'active') {
      throw new BadRequestException('Offer is not active');
    }

    // Check quantity
    if (offer.quantityLimit && offer.quantityClaimed >= offer.quantityLimit) {
      throw new BadRequestException('Offer is sold out');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await this.usersService.updateStripeCustomerId(userId, stripeCustomerId);
    }

    // Create order in pending state
    const order = await this.prisma.order.create({
      data: {
        userId,
        eventId: dto.eventId,
        offerId: dto.offerId,
        productId: offer.productId,
        amount: offer.offerPrice,
        status: 'pending',
        referralId: dto.referralCode ? await this.findReferralId(dto.referralCode) : undefined,
      },
    });

    // Create Stripe checkout session
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: offer.title,
              description: offer.description || undefined,
              images: offer.product.imageUrl ? [offer.product.imageUrl] : undefined,
            },
            unit_amount: Math.round(Number(offer.offerPrice) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/e/${offer.eventId}?checkout=cancelled`,
      metadata: {
        orderId: order.id,
        offerId: offer.id,
        eventId: dto.eventId,
        userId,
      },
    });

    // Update order with checkout session ID
    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return {
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret || 'whsec_xxx',
      );
    } catch (err) {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentFailed(paymentIntent);
        break;
      }
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) return;

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        stripePaymentIntentId: session.payment_intent as string,
      },
      include: {
        user: true,
        offer: true,
      },
    });

    // Increment offer claimed count
    if (order.offerId) {
      await this.offersService.incrementClaimed(order.offerId);
    }

    // Create order event
    await this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'payment_completed',
        payload: {
          stripeSessionId: session.id,
          amount: order.amount,
        },
        source: 'stripe',
      },
    });

    // Broadcast order update
    if (order.eventId) {
      this.wsGateway.broadcastOrderUpdate(order.eventId, order.userId, {
        orderId: order.id,
        status: 'paid',
        offerId: order.offerId || '',
        amount: Number(order.amount),
        userDisplayName: order.user.displayName,
      });
    }

    // Update referral if applicable
    if (order.referralId) {
      await this.prisma.referral.update({
        where: { id: order.referralId },
        data: {
          conversions: { increment: 1 },
          revenueGenerated: { increment: order.amount },
        },
      });
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const order = await this.prisma.order.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!order) return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'failed' },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'payment_failed',
        payload: {
          reason: paymentIntent.last_payment_error?.message || 'Unknown error',
        },
        source: 'stripe',
      },
    });
  }

  private async findReferralId(code: string): Promise<string | undefined> {
    const referral = await this.prisma.referral.findUnique({
      where: { code },
    });
    return referral?.id;
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        offer: true,
        product: true,
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async findById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        offer: true,
        product: true,
        events: true,
      },
    });
  }

  async getCheckoutSessionStatus(sessionId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    return {
      status: session.payment_status,
      orderId: session.metadata?.orderId,
    };
  }
}
