import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AiSearchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  query: string;
}
