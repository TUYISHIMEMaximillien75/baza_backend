import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { VerificationStatus, VerificationType } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('verification_requests')
export class VerificationRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: VerificationType,
  })
  verificationType: VerificationType;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  reviewedById: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;
}
