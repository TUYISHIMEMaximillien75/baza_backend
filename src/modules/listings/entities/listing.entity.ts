import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingPurpose, ListingStatus } from '../../../common/enums';
import { Category } from '../../categories/entities/category.entity';
import { Location } from '../../locations/entities/location.entity';
import { User } from '../../users/entities/user.entity';
import { ListingImage } from './listing-image.entity';

@Entity('listings')
@Index(['slug'])
@Index(['status'])
@Index(['purpose'])
@Index(['price'])
@Index(['publishedAt'])
export class Listing extends BaseEntity {
  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'uuid', nullable: true })
  locationId: string;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 10, default: 'RWF' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ListingPurpose,
    default: ListingPurpose.SALE,
  })
  purpose: ListingPurpose;

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.DRAFT,
  })
  status: ListingStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImageUrl: string;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  publishedAt: Date;

  @OneToMany(() => ListingImage, (image) => image.listing)
  images: ListingImage[];
}
