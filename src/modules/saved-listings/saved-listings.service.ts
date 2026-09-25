import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedListing } from './entities/saved-listing.entity';

@Injectable()
export class SavedListingsService {
  constructor(
    @InjectRepository(SavedListing)
    private readonly savedListingsRepo: Repository<SavedListing>,
  ) {}

  async save(userId: string, listingId: string) {
    const existing = await this.savedListingsRepo.findOne({ where: { userId, listingId } });
    if (existing) throw new ConflictException('Listing is already saved');

    const saved = this.savedListingsRepo.create({ userId, listingId });
    await this.savedListingsRepo.save(saved);
    return { saved: true, listingId };
  }

  async unsave(userId: string, listingId: string) {
    const existing = await this.savedListingsRepo.findOne({ where: { userId, listingId } });
    if (!existing) throw new NotFoundException('Saved listing not found');
    await this.savedListingsRepo.remove(existing);
    return { saved: false, listingId };
  }

  async findByUser(userId: string) {
    const items = await this.savedListingsRepo.find({
      where: { userId },
      relations: ['listing', 'listing.category', 'listing.location', 'listing.owner'],
      order: { createdAt: 'DESC' },
    });

    return items.map((sl) => {
      const l = sl.listing;
      if (!l) return null;
      const ownerName = l.owner ? `${l.owner.firstName} ${l.owner.lastName}` : 'Unknown';
      const locationStr = l.location
        ? [l.location.sector, l.location.district, l.location.province].filter(Boolean).join(', ')
        : '';
      return {
        savedId: sl.id,
        savedAt: sl.createdAt,
        id: l.id,
        title: l.title,
        slug: l.slug,
        description: l.description,
        price: Number(l.price),
        currency: l.currency,
        purpose: l.purpose,
        status: l.status,
        category: l.category?.name ?? '',
        categorySlug: l.category?.slug ?? '',
        location: locationStr,
        coverImageUrl: l.coverImageUrl ?? '',
        isFeatured: l.isFeatured,
        isVerified: l.isVerified,
        ownerName,
        ownerRole: (l.owner as any)?.roles?.[0]?.name ?? 'SELLER',
        createdAt: l.createdAt?.toISOString() ?? '',
      };
    }).filter(Boolean);
  }

  async isSaved(userId: string, listingId: string): Promise<boolean> {
    const existing = await this.savedListingsRepo.findOne({ where: { userId, listingId } });
    return !!existing;
  }

  async getSavedIds(userId: string): Promise<string[]> {
    const items = await this.savedListingsRepo.find({ where: { userId }, select: ['listingId'] });
    return items.map((sl) => sl.listingId);
  }
}
