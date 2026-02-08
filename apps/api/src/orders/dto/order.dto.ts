import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutSessionDto {
  @ApiProperty()
  @IsUUID()
  offerId: string;

  @ApiProperty()
  @IsUUID()
  eventId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referralCode?: string;
}
