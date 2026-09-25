import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SavedListingsService } from './saved-listings.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Saved Listings')
@ApiBearerAuth('JWT-auth')
@Controller('saved-listings')
export class SavedListingsController {
  constructor(private readonly savedListingsService: SavedListingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all saved listings for the current user' })
  findAll(@CurrentUser('id') userId: string) {
    return this.savedListingsService.findByUser(userId);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Get IDs of all saved listings for the current user' })
  getSavedIds(@CurrentUser('id') userId: string) {
    return this.savedListingsService.getSavedIds(userId);
  }

  @Post(':listingId')
  @ApiOperation({ summary: 'Save a listing' })
  save(
    @CurrentUser('id') userId: string,
    @Param('listingId') listingId: string,
  ) {
    return this.savedListingsService.save(userId, listingId);
  }

  @Delete(':listingId')
  @ApiOperation({ summary: 'Remove a listing from saved collection' })
  unsave(
    @CurrentUser('id') userId: string,
    @Param('listingId') listingId: string,
  ) {
    return this.savedListingsService.unsave(userId, listingId);
  }
}
