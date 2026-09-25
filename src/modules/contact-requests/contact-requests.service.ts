import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactRequest } from './entities/contact-request.entity';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { Listing } from '../listings/entities/listing.entity';

@Injectable()
export class ContactRequestsService {
  constructor(
    @InjectRepository(ContactRequest)
    private readonly contactRequestsRepo: Repository<ContactRequest>,
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
  ) {}

  async create(senderId: string | null, dto: CreateContactRequestDto) {
    const listing = await this.listingsRepo.findOne({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException(`Listing '${dto.listingId}' not found`);

    const contactRequest = this.contactRequestsRepo.create({
      listingId: dto.listingId,
      senderId: senderId || undefined,
      receiverId: listing.ownerId,
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      message: dto.message,
    });

    return this.contactRequestsRepo.save(contactRequest);
  }

  async findReceived(receiverId: string) {
    return this.contactRequestsRepo.find({
      where: { receiverId },
      relations: ['listing', 'sender'],
      order: { createdAt: 'DESC' },
    });
  }
}
