import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitRequest } from './entities/visit-request.entity';
import { CreateVisitRequestDto } from './dto/create-visit-request.dto';
import { Listing } from '../listings/entities/listing.entity';

@Injectable()
export class VisitRequestsService {
  constructor(
    @InjectRepository(VisitRequest)
    private readonly visitRequestsRepo: Repository<VisitRequest>,
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
  ) {}

  async create(requesterId: string, dto: CreateVisitRequestDto) {
    const listing = await this.listingsRepo.findOne({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException(`Listing '${dto.listingId}' not found`);

    const visitRequest = this.visitRequestsRepo.create({
      listingId: dto.listingId,
      requesterId,
      sellerId: listing.ownerId,
      preferredDate: new Date(dto.preferredDate),
      preferredTime: dto.preferredTime,
      message: dto.message,
    });

    const saved = await this.visitRequestsRepo.save(visitRequest);
    return saved;
  }

  async findByRequester(requesterId: string) {
    return this.visitRequestsRepo.find({
      where: { requesterId },
      relations: ['listing', 'listing.category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findBySeller(sellerId: string) {
    return this.visitRequestsRepo.find({
      where: { sellerId },
      relations: ['listing', 'requester'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(userId: string, id: string, status: string) {
    const request = await this.visitRequestsRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Visit request not found');

    // Only the seller or requester can update
    if (request.sellerId !== userId && request.requesterId !== userId) {
      throw new ForbiddenException('Not authorized to update this request');
    }

    request.status = status as any;
    return this.visitRequestsRepo.save(request);
  }
}
