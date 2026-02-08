import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto, UpdateOfferDto, OpenOfferDto, CloseOfferDto } from './dto/offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('offers')
@Controller()
export class OffersController {
  constructor(private offersService: OffersService) {}

  @Post('events/:eventId/offers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an offer for an event' })
  async create(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.create(eventId, user.id, dto);
  }

  @Get('events/:eventId/offers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all offers for an event' })
  async findByEvent(@Param('eventId') eventId: string) {
    return this.offersService.findByEvent(eventId);
  }

  @Get('events/:eventId/offers/active')
  @ApiOperation({ summary: 'Get active offer for an event' })
  async findActiveByEvent(@Param('eventId') eventId: string) {
    return this.offersService.findActiveByEvent(eventId);
  }

  @Patch('offers/:offerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an offer' })
  async update(
    @Param('offerId') offerId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offersService.update(offerId, user.id, dto);
  }

  @Post('offers/:offerId/open')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Open an offer (makes it active)' })
  async open(
    @Param('offerId') offerId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: OpenOfferDto,
  ) {
    return this.offersService.openOffer(offerId, user.id, dto);
  }

  @Post('offers/:offerId/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'host')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close an offer' })
  async close(
    @Param('offerId') offerId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CloseOfferDto,
  ) {
    return this.offersService.closeOffer(offerId, user.id, dto);
  }
}
