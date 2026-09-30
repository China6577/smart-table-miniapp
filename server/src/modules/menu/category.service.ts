import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BusinessException } from '../../common/business.exception'
import { CategoryEntity } from '../../database/entities/category.entity'
import { DishEntity } from '../../database/entities/dish.entity'
import { toCategoryDto } from '../../common/mappers'
import { genId } from '../../utils/ids'
import type { CategoryPayloadDto } from './menu.dto'

/** 分类管理：名称查重、删除前置校验（分类下不允许仍有菜品） */
@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(DishEntity)
    private readonly dishRepo: Repository<DishEntity>,
  ) {}

  /** 全部分类（含停用），按 sort 升序 */
  async list(): Promise<Array<{ id: string; name: string; sort: number; status: 0 | 1 }>> {
    const all = await this.categoryRepo.find()
    return all.sort((a, b) => a.sort - b.sort).map(toCategoryDto)
  }

  async create(dto: CategoryPayloadDto): Promise<{ id: string; name: string; sort: number; status: 0 | 1 }> {
    const name = dto.name.trim()
    if (!name) throw new BusinessException(422, '分类名称不能为空')
    const exists = await this.categoryRepo.findOne({ where: { name } })
    if (exists) throw new BusinessException(422, '分类已存在')

    const count = await this.categoryRepo.count()
    const category = this.categoryRepo.create({
      id: genId('c'),
      name,
      sort: dto.sort ?? count + 1,
      status: dto.status ?? 1,
    })
    await this.categoryRepo.save(category)
    return toCategoryDto(category)
  }

  async update(
    id: string,
    dto: Partial<CategoryPayloadDto>,
  ): Promise<{ id: string; name: string; sort: number; status: 0 | 1 }> {
    const category = await this.categoryRepo.findOne({ where: { id } })
    if (!category) throw new BusinessException(404, '分类不存在')

    if (dto.name !== undefined) {
      const name = dto.name.trim()
      if (!name) throw new BusinessException(422, '分类名称不能为空')
      const conflict = await this.categoryRepo.findOne({ where: { name } })
      if (conflict && conflict.id !== id) throw new BusinessException(422, '分类名称已存在')
      category.name = name
    }
    if (dto.sort !== undefined) category.sort = dto.sort
    if (dto.status !== undefined) category.status = dto.status

    await this.categoryRepo.save(category)
    return toCategoryDto(category)
  }

  async remove(id: string): Promise<boolean> {
    const category = await this.categoryRepo.findOne({ where: { id } })
    if (!category) throw new BusinessException(404, '分类不存在')

    const dishCount = await this.dishRepo.count({ where: { categoryId: id } })
    if (dishCount > 0) throw new BusinessException(422, '该分类下仍有菜品，请先移除或转移菜品')

    await this.categoryRepo.delete(id)
    return true
  }
}
