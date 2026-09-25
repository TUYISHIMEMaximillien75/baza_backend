import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('user_profiles')
export class UserProfile extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sector: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  preferredLanguage: string;
}
