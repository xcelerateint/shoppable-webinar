import { IsString, IsOptional, IsNumber, IsEnum, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePresentationDto {
  @ApiProperty({ example: 'Product Launch Deck' })
  @IsString()
  title: string;
}

export class CreateSlideDto {
  @ApiPropertyOptional({ example: 'Welcome Slide' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: ['image', 'video', 'embed', 'html'] })
  @IsOptional()
  @IsEnum(['image', 'video', 'embed', 'html'])
  type?: 'image' | 'video' | 'embed' | 'html';

  @ApiPropertyOptional({ example: 'Introduce yourself and the topic' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationSeconds?: number;

  @ApiPropertyOptional({ enum: ['none', 'fade', 'slide', 'zoom'] })
  @IsOptional()
  @IsEnum(['none', 'fade', 'slide', 'zoom'])
  transition?: 'none' | 'fade' | 'slide' | 'zoom';
}

export class UpdateSlideDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationSeconds?: number;

  @ApiPropertyOptional({ enum: ['none', 'fade', 'slide', 'zoom'] })
  @IsOptional()
  @IsEnum(['none', 'fade', 'slide', 'zoom'])
  transition?: 'none' | 'fade' | 'slide' | 'zoom';
}

export class GoToSlideDto {
  @ApiProperty()
  @IsUUID()
  presentationId: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(0)
  slideIndex: number;

  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}

export class ChangeLayoutDto {
  @ApiProperty({ enum: ['video_only', 'slides_only', 'slides_main', 'video_main', 'side_by_side'] })
  @IsEnum(['video_only', 'slides_only', 'slides_main', 'video_main', 'side_by_side'])
  mode: 'video_only' | 'slides_only' | 'slides_main' | 'video_main' | 'side_by_side';

  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}

export class StartPresentationDto {
  @ApiProperty()
  @IsUUID()
  presentationId: string;

  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}

export class StopPresentationDto {
  @ApiProperty()
  @IsString()
  idempotencyKey: string;
}
