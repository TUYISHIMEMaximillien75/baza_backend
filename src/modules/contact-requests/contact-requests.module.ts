import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactRequest } from './entities/contact-request.entity';
import { ContactRequestsService } from './contact-requests.service';
import { ContactRequestsController } from './contact-requests.controller';
import { Listing } from '../listings/entities/listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContactRequest, Listing])],
  controllers: [ContactRequestsController],
  providers: [ContactRequestsService],
  exports: [ContactRequestsService],
})
export class ContactRequestsModule {}
