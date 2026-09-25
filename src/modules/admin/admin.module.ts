import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Listing } from '../listings/entities/listing.entity';
import { VerificationRequest } from '../verifications/entities/verification-request.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Listing, VerificationRequest])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
