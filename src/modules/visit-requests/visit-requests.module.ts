import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitRequest } from './entities/visit-request.entity';
import { VisitRequestsService } from './visit-requests.service';
import { VisitRequestsController } from './visit-requests.controller';
import { Listing } from '../listings/entities/listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VisitRequest, Listing])],
  controllers: [VisitRequestsController],
  providers: [VisitRequestsService],
  exports: [VisitRequestsService],
})
export class VisitRequestsModule {}
