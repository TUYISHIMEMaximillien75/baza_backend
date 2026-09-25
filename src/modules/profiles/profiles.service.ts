import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';

export class UpdateProfileDto {
  bio?: string;
  province?: string;
  district?: string;
  sector?: string;
  address?: string;
  preferredLanguage?: string;
}

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profilesRepository: Repository<UserProfile>,
  ) {}

  async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.profilesRepository.findOne({ where: { userId } });
  }

  async upsertProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    let profile = await this.findByUserId(userId);
    if (!profile) {
      profile = this.profilesRepository.create({ userId, ...dto });
    } else {
      Object.assign(profile, dto);
    }
    return this.profilesRepository.save(profile);
  }
}
