import { IsString, IsOptional, IsBoolean, IsDateString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ example: 'Summer Sale Live' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Exclusive deals revealed live!' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2024-03-15T18:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  chatEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  offersEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  replayOffersEnabled?: boolean;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Summer Sale Live - Updated' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'New description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2024-03-15T18:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chatEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  offersEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  replayOffersEnabled?: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;
}
