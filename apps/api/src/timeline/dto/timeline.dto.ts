import { IsString, IsOptional, IsNumber, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimelineEventDto {
  @ApiProperty({ example: 'CHAPTER_MARK' })
  @IsString()
  type: string;

  @ApiProperty()
  @IsObject()
  payload: Record<string, unknown>;

  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}

export class CreateCountdownDto {
  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(1)
  durationSeconds: number;

  @ApiProperty({ example: 'Offer opens in...' })
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}

export class CreateChapterDto {
  @ApiProperty({ example: 'Product Demo' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'See the widget in action' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}
