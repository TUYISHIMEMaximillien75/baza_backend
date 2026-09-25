import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Listing } from './entities/listing.entity';
import { ListingQueryDto } from './dto/listing-query.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { Category } from '../categories/entities/category.entity';
import { Location } from '../locations/entities/location.entity';
import { ListingStatus } from '../../common/enums';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Location)
    private readonly locationsRepository: Repository<Location>,
  ) {}

  // ─── Create listing ───────────────────────────────────────────────────────────
  async create(ownerId: string, dto: CreateListingDto) {
    const category = await this.categoriesRepository.findOne({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException(`Category with ID '${dto.categoryId}' not found`);
    }

    // Slug generation
    const baseSlug = dto.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug}-${randomSuffix}`;

    // Handle Location creation if provided
    let locationId: string | null = null;
    if (dto.province || dto.district || dto.sector) {
      let location = await this.locationsRepository.findOne({
        where: {
          province: dto.province || 'Kigali City',
          district: dto.district || 'Gasabo',
          sector: dto.sector || 'Gacuriro',
        },
      });

      if (!location) {
        location = this.locationsRepository.create({
          province: dto.province || 'Kigali City',
          district: dto.district || 'Gasabo',
          sector: dto.sector || 'Gacuriro',
        });
        location = await this.locationsRepository.save(location);
      }
      locationId = location.id;
    }

    const listing = this.listingsRepository.create({
      title: dto.title,
      slug,
      description: dto.description,
      price: dto.price,
      currency: dto.currency || 'RWF',
      purpose: dto.purpose,
      status: ListingStatus.PUBLISHED, // Published immediately for easy testing
      publishedAt: new Date(),
      ownerId,
      categoryId: category.id,
      locationId: locationId || undefined,
      coverImageUrl: dto.coverImageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
      isVerified: true,
      isFeatured: false,
    });

    const saved = await this.listingsRepository.save(listing);
    return this.findBySlug(saved.slug);
  }

  // ─── Public: Paginated list ───────────────────────────────────────────────────
  async findAll(query: ListingQueryDto) {
    const { page = 1, limit = 12, search, categorySlug, purpose, minPrice, maxPrice, province, district, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const qb = this.buildBaseQuery();

    // Only show published listings on public endpoints
    qb.andWhere('listing.status = :status', { status: ListingStatus.PUBLISHED });

    if (search) {
      qb.andWhere(
        '(LOWER(listing.title) LIKE :search OR LOWER(listing.description) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (categorySlug) {
      qb.andWhere('category.slug = :categorySlug', { categorySlug });
    }

    if (purpose) {
      qb.andWhere('listing.purpose = :purpose', { purpose });
    }

    if (minPrice !== undefined) {
      qb.andWhere('listing.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('listing.price <= :maxPrice', { maxPrice });
    }

    if (province) {
      qb.andWhere('LOWER(location.province) LIKE :province', { province: `%${province.toLowerCase()}%` });
    }

    if (district) {
      qb.andWhere('LOWER(location.district) LIKE :district', { district: `%${district.toLowerCase()}%` });
    }

    const validSortFields: Record<string, string> = {
      createdAt: 'listing.createdAt',
      price: 'listing.price',
      publishedAt: 'listing.publishedAt',
    };
    const orderField = validSortFields[sortBy] ?? 'listing.createdAt';
    qb.orderBy(orderField, sortOrder);

    const totalItems = await qb.getCount();
    const items = await qb.skip((page - 1) * limit).take(limit).getMany();

    return {
      items: items.map(this.toResponse),
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  // ─── Public: Featured listings ────────────────────────────────────────────────
  async findFeatured(limit = 8) {
    const items = await this.buildBaseQuery()
      .andWhere('listing.status = :status', { status: ListingStatus.PUBLISHED })
      .andWhere('listing.isFeatured = true')
      .orderBy('listing.publishedAt', 'DESC')
      .take(limit)
      .getMany();

    return items.map(this.toResponse);
  }

  // ─── Public: Single listing by slug ──────────────────────────────────────────
  async findBySlug(slug: string) {
    const listing = await this.buildBaseQuery()
      .andWhere('listing.slug = :slug', { slug })
      .andWhere('listing.status = :status', { status: ListingStatus.PUBLISHED })
      .leftJoinAndSelect('listing.images', 'images')
      .getOne();

    if (!listing) throw new NotFoundException(`Listing '${slug}' not found`);

    return this.toResponse(listing);
  }

  // ─── Owner: User's own listings (all statuses) ────────────────────────────────
  async findByOwner(ownerId: string, query: ListingQueryDto) {
    const { page = 1, limit = 12, search, categorySlug, purpose, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const qb = this.buildBaseQuery()
      .andWhere('listing.ownerId = :ownerId', { ownerId });

    if (search) {
      qb.andWhere(
        '(LOWER(listing.title) LIKE :search OR LOWER(listing.description) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }
    if (categorySlug) {
      qb.andWhere('category.slug = :categorySlug', { categorySlug });
    }
    if (purpose) {
      qb.andWhere('listing.purpose = :purpose', { purpose });
    }

    const validSortFields: Record<string, string> = {
      createdAt: 'listing.createdAt',
      price: 'listing.price',
      publishedAt: 'listing.publishedAt',
    };
    qb.orderBy(validSortFields[sortBy] ?? 'listing.createdAt', sortOrder);

    const totalItems = await qb.getCount();
    const items = await qb.skip((page - 1) * limit).take(limit).getMany();

    return {
      items: items.map(this.toResponse),
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  // ─── Owner: Delete own listing ────────────────────────────────────────────────
  async remove(ownerId: string, listingId: string) {
    const listing = await this.listingsRepository.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException(`Listing '${listingId}' not found`);
    if (listing.ownerId !== ownerId) throw new ForbiddenException('You do not own this listing');
    await this.listingsRepository.remove(listing);
  }

  // ─── Builder ──────────────────────────────────────────────────────────────────
  private buildBaseQuery(): SelectQueryBuilder<Listing> {
    return this.listingsRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.owner', 'owner')
      .leftJoinAndSelect('listing.category', 'category')
      .leftJoinAndSelect('listing.location', 'location');
  }

  // ─── Shape response ───────────────────────────────────────────────────────────
  private toResponse(listing: Listing) {
    const ownerName = listing.owner
      ? `${listing.owner.firstName} ${listing.owner.lastName}`
      : 'Unknown';

    const locationStr = listing.location
      ? [listing.location.sector, listing.location.district, listing.location.province]
          .filter(Boolean)
          .join(', ')
      : '';

    return {
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      description: listing.description,
      price: Number(listing.price),
      currency: listing.currency,
      purpose: listing.purpose,
      status: listing.status,
      category: listing.category?.name ?? '',
      categorySlug: listing.category?.slug ?? '',
      location: locationStr,
      coverImageUrl: listing.coverImageUrl ?? '',
      isFeatured: listing.isFeatured,
      isVerified: listing.isVerified,
      ownerName,
      ownerRole: listing.owner?.roles?.[0]?.name ?? 'SELLER',
      ownerAvatar: listing.owner?.profileImageUrl ?? null,
      createdAt: listing.createdAt?.toISOString() ?? '',
      publishedAt: listing.publishedAt?.toISOString() ?? null,
      images: (listing as any).images?.map((img: any) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        altText: img.altText,
        isCover: img.isCover,
        displayOrder: img.displayOrder,
      })) ?? [],
    };
  }
}
