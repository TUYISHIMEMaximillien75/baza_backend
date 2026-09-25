import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ReportStatus } from '../../../common/enums';
import { Listing } from '../../listings/entities/listing.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reports')
export class Report extends BaseEntity {
  @Column({ type: 'uuid' })
  listingId: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @Column({ type: 'uuid' })
  reportedById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportedById' })
  reportedBy: User;

  @Column({ type: 'varchar', length: 100 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedById: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User;

  @Column({ type: 'timestamp with time zone', nullable: true })
  reviewedAt: Date;
}
