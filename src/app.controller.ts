import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getRoot() {
    return {
      name: 'BAZA Marketplace API',
      version: '1.0.0',
      status: 'online',
      documentation: '/api/docs',
      endpoints: {
        health: '/api/v1/health',
        listings: '/api/v1/listings',
        categories: '/api/v1/categories',
        auth: '/api/v1/auth',
      },
    };
  }
}
