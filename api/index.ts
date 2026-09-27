import * as dns from 'dns';
import * as net from 'net';
dns.setDefaultResultOrder('ipv4first');

// Patch net.Socket.prototype.connect for IPv4 (Neon DB compatibility)
const _origSocketConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (options: any, ...args: any[]) {
  if (typeof options === 'object' && options !== null) {
    options = { ...options, family: 4 };
  } else if (typeof options === 'number') {
    const [host, cb] = args;
    options = { port: options, host: typeof host === 'string' ? host : undefined, family: 4 };
    args = typeof host === 'function' ? [host] : typeof cb === 'function' ? [cb] : [];
  }
  return _origSocketConnect.call(this, options, ...args);
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

// Global Express CORS handling for Vercel Serverless environment
server.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

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
  const expressApp = await bootstrap();
  return expressApp(req, res);
}
