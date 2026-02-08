import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  RawBodyRequest,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateCheckoutSessionDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post('checkout/session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  async createCheckoutSession(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.ordersService.createCheckoutSession(user.id, dto);
  }

  @Get('checkout/session/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get checkout session status' })
  async getCheckoutSessionStatus(@Param('sessionId') sessionId: string) {
    return this.ordersService.getCheckoutSessionStatus(sessionId);
  }

  @Post('webhooks/stripe')
  @Public()
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body is required');
    }
    return this.ordersService.handleStripeWebhook(rawBody, signature);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user orders' })
  async findMyOrders(@CurrentUser() user: CurrentUserData) {
    return this.ordersService.findByUser(user.id);
  }

  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  async findById(@Param('orderId') orderId: string) {
    return this.ordersService.findById(orderId);
  }
}
