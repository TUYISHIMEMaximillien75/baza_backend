import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { ListingQueryDto } from './dto/listing-query.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get paginated published listings with filters' })
  findAll(@Query() query: ListingQueryDto) {
    return this.listingsService.findAll(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured published listings for homepage' })
  findFeatured(@Query('limit') limit?: string) {
    return this.listingsService.findFeatured(limit ? parseInt(limit) : 8);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Get all listings owned by the authenticated user' })
  findMine(
    @CurrentUser('id') userId: string,
    @Query() query: ListingQueryDto,
  ) {
    return this.listingsService.findByOwner(userId, query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get single published listing by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.listingsService.findBySlug(slug);
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Create a new property or vehicle listing' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingsService.create(userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a listing owned by the authenticated user' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') listingId: string,
  ) {
    return this.listingsService.remove(userId, listingId);
  }
}
