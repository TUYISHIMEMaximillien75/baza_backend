import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async checkHealth() {
    let dbStatus = 'disconnected';
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
      }
    } catch (error) {
      dbStatus = 'error';
    }

    return {
      status: 'ok',
      database: dbStatus,
      environment: this.configService.get<string>('nodeEnv', 'development'),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
