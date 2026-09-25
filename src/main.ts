import * as dns from 'dns';
import * as net from 'net';
dns.setDefaultResultOrder('ipv4first');

// Patch net.Socket.prototype.connect to always use IPv4 (family: 4).
// The pg driver creates `new net.Socket()` then calls `.connect(port, host)`
// without specifying a family, causing ETIMEDOUT via IPv6 on Neon in this env.
const _origSocketConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (options: any, ...args: any[]) {
  if (typeof options === 'object' && options !== null) {
    options = { ...options, family: 4 };
  } else if (typeof options === 'number') {
    // connect(port, host, cb) form — wrap into options object
    const [host, cb] = args;
    options = { port: options, host: typeof host === 'string' ? host : undefined, family: 4 };
    args = typeof host === 'function' ? [host] : typeof cb === 'function' ? [cb] : [];
  }
  return _origSocketConnect.call(this, options, ...args);
} as any;


import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  // CORS
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:5173');
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // Global prefix & URI versioning (/api/v1/...)
  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('BAZA Marketplace API')
    .setDescription('Technical foundation API for BAZA property and vehicle marketplace in Rwanda')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'JWT-auth',
    )
    .addTag('Health', 'System health checks')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Listings', 'Property and vehicle listings')
    .addTag('Categories', 'Marketplace categories')
    .addTag('Locations', 'Rwandan locations')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('port', 3000);
  await app.listen(port);
  console.log(`🚀 BAZA Backend running at http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
