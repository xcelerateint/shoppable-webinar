import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendChatMessageDto {
  @ApiProperty({ example: 'This is amazing!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}

export class DeleteMessageDto {
  @ApiProperty({ required: false })
  @IsString()
  reason?: string;
}
