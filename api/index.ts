import * as dns from 'dns';
import * as net from 'net';
dns.setDefaultResultOrder('ipv4first');

// Patch net.Socket.prototype.connect for IPv4 (Neon DB compatibility)
const _origSocketConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (this: any, ...args: any[]) {
  if (args[0] && typeof args[0] === 'object') {
    if (args[0].family === undefined) {
      args[0] = { ...args[0], family: 4 };
    }
  }
  return _origSocketConnect.apply(this, args as any);
} as any;

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

const server = express();

let cachedApp: any;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
    const configService = app.get(ConfigService);

    app.enableCors({
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    });

    app.setGlobalPrefix('api', { exclude: ['/'] });
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

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

    await app.init();
    cachedApp = app;
  }
  return server;
}

export default async function handler(req: any, res: any) {
  // Always attach CORS headers on all Vercel responses
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const expressApp = await bootstrap();
    return expressApp(req, res);
  } catch (error: any) {
    console.error('Vercel handler bootstrap error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Backend Bootstrap Error: ' + (error?.message || String(error)),
      error: 'Internal Server Error',
    });
  }
}
