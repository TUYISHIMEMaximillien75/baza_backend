import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedListing } from './entities/saved-listing.entity';
import { SavedListingsService } from './saved-listings.service';
import { SavedListingsController } from './saved-listings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SavedListing])],
  controllers: [SavedListingsController],
  providers: [SavedListingsService],
  exports: [SavedListingsService],
})
export class SavedListingsModule {}
