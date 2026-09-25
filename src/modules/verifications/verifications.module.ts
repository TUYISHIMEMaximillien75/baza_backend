import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationRequest } from './entities/verification-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationRequest])],
})
export class VerificationsModule {}
