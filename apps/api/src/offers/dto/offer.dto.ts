import { IsString, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 'Flash Deal - 50% Off!' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Limited time only' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 49.99 })
  @IsNumber()
  @Min(0)
  offerPrice: number;

  @ApiPropertyOptional({ example: 99.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantityLimit?: number;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimitSeconds?: number;
}

export class UpdateOfferDto {
  @ApiPropertyOptional({ example: 'Updated Flash Deal' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  offerPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantityLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimitSeconds?: number;
}

export class OpenOfferDto {
  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}

export class CloseOfferDto {
  @ApiProperty()
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({ enum: ['manual', 'sold_out', 'expired'] })
  @IsOptional()
  @IsString()
  reason?: 'manual' | 'sold_out' | 'expired';
}
