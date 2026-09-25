import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Listing } from '../listings/entities/listing.entity';
import { VerificationRequest } from '../verifications/entities/verification-request.entity';
import { VerificationStatus, ListingStatus } from '../../common/enums';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
    @InjectRepository(VerificationRequest)
    private readonly verificationsRepo: Repository<VerificationRequest>,
  ) {}

  // ─── Platform-wide stats ─────────────────────────────────────────────────────
  async getPlatformStats() {
    const [totalUsers, totalListings, pendingListings, pendingVerifications] = await Promise.all([
      this.usersRepo.count(),
      this.listingsRepo.count(),
      this.listingsRepo.count({ where: { status: ListingStatus.PENDING_REVIEW } }),
      this.verificationsRepo.count({ where: { status: VerificationStatus.PENDING } }),
    ]);

    return {
      totalUsers,
      totalListings,
      pendingListings,
      pendingVerifications,
    };
  }

  // ─── Pending verification requests ───────────────────────────────────────────
  async getPendingVerifications(limit = 10) {
    const items = await this.verificationsRepo.find({
      where: { status: VerificationStatus.PENDING },
      relations: ['user'],
      order: { submittedAt: 'ASC' },
      take: limit,
    });

    return items.map((v) => ({
      id: v.id,
      userId: v.userId,
      userName: v.user ? `${v.user.firstName} ${v.user.lastName}` : 'Unknown',
      userEmail: v.user?.email ?? '',
      verificationType: v.verificationType,
      status: v.status,
      submittedAt: v.submittedAt?.toISOString() ?? v.createdAt?.toISOString() ?? null,
    }));
  }

  // ─── Pending listings ─────────────────────────────────────────────────────────
  async getPendingListings(limit = 10) {
    const items = await this.listingsRepo.find({
      where: { status: ListingStatus.PENDING_REVIEW },
      relations: ['owner', 'category'],
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return items.map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      category: l.category?.name ?? '',
      ownerName: l.owner ? `${l.owner.firstName} ${l.owner.lastName}` : 'Unknown',
      price: Number(l.price),
      currency: l.currency,
      status: l.status,
      createdAt: l.createdAt?.toISOString() ?? null,
    }));
  }

  // ─── Approve / reject verification ───────────────────────────────────────────
  async reviewVerification(
    id: string,
    reviewerId: string,
    action: 'APPROVE' | 'REJECT',
    rejectionReason?: string,
  ) {
    const request = await this.verificationsRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!request) throw new Error('Verification request not found');

    request.status =
      action === 'APPROVE' ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;
    request.reviewedById = reviewerId;
    request.reviewedAt = new Date();
    if (rejectionReason) request.rejectionReason = rejectionReason;

    return this.verificationsRepo.save(request);
  }

  // ─── Approve / reject listing ────────────────────────────────────────────────
  async reviewListing(
    id: string,
    action: 'APPROVE' | 'REJECT',
    rejectionReason?: string,
  ) {
    const listing = await this.listingsRepo.findOne({ where: { id } });
    if (!listing) throw new Error('Listing not found');

    listing.status =
      action === 'APPROVE' ? ListingStatus.PUBLISHED : ListingStatus.REJECTED;
    if (action === 'APPROVE') {
      listing.publishedAt = new Date();
    }

    return this.listingsRepo.save(listing);
  }

  // ─── Users list ───────────────────────────────────────────────────────────────
  async getUsers(page = 1, limit = 20, search?: string) {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .orderBy('user.createdAt', 'DESC');

    if (search) {
      qb.where(
        '(LOWER(user.firstName) LIKE :s OR LOWER(user.lastName) LIKE :s OR LOWER(user.email) LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }

    const totalItems = await qb.getCount();
    const users = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items: users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        status: u.status,
        emailVerified: u.emailVerified,
        roles: u.roles?.map((r) => r.name) ?? [],
        createdAt: u.createdAt?.toISOString() ?? null,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      })),
      meta: {
        totalItems,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }
}
