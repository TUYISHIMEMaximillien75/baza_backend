import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { AiSearchService } from './ai-search.service';
import { AiSearchController } from './ai-search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Listing])],
  controllers: [AiSearchController],
  providers: [AiSearchService],
})
export class AiSearchModule {}
