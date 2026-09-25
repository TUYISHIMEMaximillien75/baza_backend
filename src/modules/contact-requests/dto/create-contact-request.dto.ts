import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactRequestDto {
  @ApiProperty()
  @IsUUID()
  listingId: string;

  @ApiProperty({ example: 'Alice Uwimana' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+250788123456' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: 'alice@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'I am interested in this property. Is it still available?' })
  @IsString()
  @MinLength(10)
  message: string;
}
