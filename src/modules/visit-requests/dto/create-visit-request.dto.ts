import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVisitRequestDto {
  @ApiProperty({ example: 'uuid-of-listing' })
  @IsUUID()
  listingId: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  preferredDate: string;

  @ApiProperty({ example: '10:00 AM', required: false })
  @IsOptional()
  @IsString()
  preferredTime?: string;

  @ApiProperty({ example: 'I would like to see the property on Saturday morning.', required: false })
  @IsOptional()
  @IsString()
  @MinLength(10)
  message?: string;
}
