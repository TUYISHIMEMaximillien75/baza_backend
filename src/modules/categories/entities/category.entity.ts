import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('categories')
@Index(['slug'])
export class Category extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  parentId: string;

  @ManyToOne(() => Category, (category) => category.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];
}
