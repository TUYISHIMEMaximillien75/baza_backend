import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Listing } from '../listings/entities/listing.entity';
import { RoleName, ListingStatus } from '../../common/enums';

export class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Listing)
    private readonly listingsRepository: Repository<Listing>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: ['roles'] });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email }, relations: ['roles'] });
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    passwordHash: string;
  }): Promise<User> {
    const existing = await this.usersRepository.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('An account with this email address already exists');

    let userRole = await this.rolesRepository.findOne({ where: { name: RoleName.USER } });
    if (!userRole) {
      userRole = this.rolesRepository.create({ name: RoleName.USER, description: 'Standard user' });
      userRole = await this.rolesRepository.save(userRole);
    }

    const user = this.usersRepository.create({ ...data, roles: [userRole] });
    return this.usersRepository.save(user);
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findByIdOrThrow(id);
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }

  async getDashboardStats(userId: string) {
    const counts = await this.listingsRepository
      .createQueryBuilder('l')
      .select('l.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('l.ownerId = :userId', { userId })
      .groupBy('l.status')
      .getRawMany();

    const statusMap: Record<string, number> = {};
    counts.forEach(({ status, count }) => { statusMap[status] = parseInt(count); });

    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const approved = (statusMap[ListingStatus.PUBLISHED] ?? 0) + (statusMap[ListingStatus.APPROVED] ?? 0);
    const pending = statusMap[ListingStatus.PENDING_REVIEW] ?? 0;
    const sold = (statusMap[ListingStatus.SOLD] ?? 0) + (statusMap[ListingStatus.RENTED] ?? 0);

    return { total, approved, pending, sold };
  }
}
