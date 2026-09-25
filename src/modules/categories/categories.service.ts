import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { isActive: true, parentId: null },
      relations: ['children'],
      order: { name: 'ASC' },
    });
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { slug, isActive: true },
      relations: ['children'],
    });
    if (!category) throw new NotFoundException(`Category '${slug}' not found`);
    return category;
  }
}
