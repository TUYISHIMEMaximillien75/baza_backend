import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  Column,
} from 'typeorm';
import { Listing } from '../../listings/entities/listing.entity';
import { User } from '../../users/entities/user.entity';

@Entity('saved_listings')
@Unique(['userId', 'listingId'])
@Index(['userId', 'listingId'])
@Index(['userId'])
export class SavedListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  listingId: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
