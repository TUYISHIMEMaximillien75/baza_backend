import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ListingPurpose } from '../../../common/enums';

export class CreateListingDto {
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters' })
  title: string;

  @IsString()
  @MinLength(20, { message: 'Description must be at least 20 characters' })
  description: string;

  @IsNumber()
  @Min(0, { message: 'Price must be non-negative' })
  price: number;

  @IsOptional()
  @IsString()
  currency?: string = 'RWF';

  @IsEnum(ListingPurpose, { message: 'Purpose must be SALE or RENT' })
  purpose: ListingPurpose;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  sector?: string;
}
