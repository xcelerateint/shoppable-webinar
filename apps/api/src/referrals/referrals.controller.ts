import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('referrals')
@Controller()
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Post('events/:eventId/referrals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create referral link for event' })
  async create(@Param('eventId') eventId: string, @CurrentUser() user: CurrentUserData) {
    return this.referralsService.create(eventId, user.id);
  }

  @Get('referrals/:code')
  @Public()
  @ApiOperation({ summary: 'Get referral info and track click' })
  async findByCode(@Param('code') code: string) {
    const info = await this.referralsService.findByCode(code);
    await this.referralsService.trackClick(code);
    return info;
  }

  @Get('users/me/referrals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user referral stats' })
  async findMyReferrals(@CurrentUser() user: CurrentUserData) {
    return this.referralsService.findByUser(user.id);
  }

  @Get('events/:eventId/referrals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get referrals for event (host only)' })
  async findByEvent(@Param('eventId') eventId: string) {
    return this.referralsService.findByEvent(eventId);
  }
}
