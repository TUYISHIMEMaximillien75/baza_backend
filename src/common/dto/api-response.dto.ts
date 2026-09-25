import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Request completed successfully' })
  message: string;

  @ApiProperty({ required: false, nullable: true })
  data?: T;

  @ApiProperty({ required: false, nullable: true })
  meta?: any;

  @ApiProperty({ example: new Date().toISOString() })
  timestamp: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 'Bad Request' })
  message: string;

  @ApiProperty({ type: [String], example: [] })
  errors: any[];

  @ApiProperty({ example: '/api/v1/health' })
  path: string;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: new Date().toISOString() })
  timestamp: string;
}
