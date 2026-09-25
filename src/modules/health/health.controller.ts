import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Check application and database health status' })
  @ApiResponse({
    status: 200,
    description: 'System health parameters',
    schema: {
      example: {
        success: true,
        message: 'Request completed successfully',
        data: {
          status: 'ok',
          database: 'connected',
          environment: 'development',
          timestamp: '2026-08-05T15:35:00.000Z',
          version: '1.0.0',
        },
        timestamp: '2026-08-05T15:35:00.000Z',
      },
    },
  })
  check() {
    return this.healthService.checkHealth();
  }
}
