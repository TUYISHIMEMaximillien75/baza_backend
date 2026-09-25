import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { RolesModule } from './modules/roles/roles.module';
import { VerificationsModule } from './modules/verifications/verifications.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ListingsModule } from './modules/listings/listings.module';
import { SavedListingsModule } from './modules/saved-listings/saved-listings.module';
import { ContactRequestsModule } from './modules/contact-requests/contact-requests.module';
import { VisitRequestsModule } from './modules/visit-requests/visit-requests.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiSearchModule } from './modules/ai-search/ai-search.module';
import {
  Category,
  ContactRequest,
  Listing,
  ListingImage,
  Location,
  Notification,
  Report,
  Role,
  SavedListing,
  User,
  UserProfile,
  VerificationRequest,
  VisitRequest,
} from './database/entities';

import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        ssl: configService.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        extra: {
          family: 4, // Force IPv4 — required for Neon connectivity in this environment
        },
        entities: [
          User,
          Role,
          UserProfile,
          VerificationRequest,
          Category,
          Location,
          Listing,
          ListingImage,
          SavedListing,
          ContactRequest,
          VisitRequest,
          Notification,
          Report,
        ],
        synchronize: false,
        retryAttempts: 1,
        retryDelay: 1000,
        logging: configService.get<string>('nodeEnv') === 'development',
      }),
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    RolesModule,
    VerificationsModule,
    CategoriesModule,
    LocationsModule,
    ListingsModule,
    SavedListingsModule,
    ContactRequestsModule,
    VisitRequestsModule,
    NotificationsModule,
    ReportsModule,
    UploadsModule,
    AdminModule,
    AiSearchModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
