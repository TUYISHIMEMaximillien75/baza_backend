import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Listing } from './listing.entity';

@Entity('listing_images')
export class ListingImage extends BaseEntity {
  @Column({ type: 'uuid' })
  listingId: string;

  @ManyToOne(() => Listing, (listing) => listing.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publicId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  altText: string;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: false })
  isCover: boolean;
}
