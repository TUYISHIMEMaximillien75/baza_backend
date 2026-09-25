import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
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
} from './entities';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
