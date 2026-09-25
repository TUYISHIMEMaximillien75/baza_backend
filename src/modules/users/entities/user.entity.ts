import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserStatus } from '../../../common/enums';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
@Index(['email'])
@Index(['phoneNumber'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profileImageUrl: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLoginAt: Date;

  @ManyToMany(() => Role, (role) => role.users, { cascade: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
