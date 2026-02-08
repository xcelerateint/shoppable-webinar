import { IsString, IsOptional, IsBoolean, IsUUID, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssetDto {
  @ApiProperty({ example: 'Product Page' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPurchase?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  offerId?: string;
}

export class DropLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiProperty({ example: 'Product Page' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'https://example.com/product' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresPurchase?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  offerId?: string;

  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}

export class DropFileDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}
