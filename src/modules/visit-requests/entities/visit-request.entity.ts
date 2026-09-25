import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { VisitStatus } from '../../../common/enums';
import { Listing } from '../../listings/entities/listing.entity';
import { User } from '../../users/entities/user.entity';

@Entity('visit_requests')
export class VisitRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  listingId: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @Column({ type: 'uuid' })
  requesterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column({ type: 'uuid' })
  sellerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'date' })
  preferredDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  preferredTime: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({
    type: 'enum',
    enum: VisitStatus,
    default: VisitStatus.PENDING,
  })
  status: VisitStatus;
}
