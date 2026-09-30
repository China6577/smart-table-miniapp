import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { BusinessException } from '../../common/business.exception'
import { CategoryEntity } from '../../database/entities/category.entity'
import { DishEntity } from '../../database/entities/dish.entity'
import { SpecGroupEntity, SpecOptionEntity } from '../../database/entities'
import { toDishDto, type DishDto } from '../../common/mappers'
import { yuanToFen } from '../../utils/money'
import { genId } from '../../utils/ids'
import type { CreateDishDto, DishQueryDto, UpdateDishDto, UpdateDishSpecsDto } from './menu.dto'

/** 菜品状态 ↔ 存储值映射（1 在售 / 0 下架 / 2 售罄） */
const STATUS_TO_DB: Record<string, number> = { on: 1, off: 0, soldout: 2 }
const STATUS_FROM_DB: Record<number, 'on' | 'off' | 'soldout'> = { 1: 'on', 0: 'off', 2: 'soldout' }

/** 新增菜品缺省图：按名称生成真实食物摄影图（与前端一致） */
function defaultDishImage(name: string): string {
  const prompt = `${name}, authentic Chinese dish, realistic food photography, served on a plain white ceramic plate on a light wooden restaurant table, warm natural lighting, 45-degree angle, appetizing, high detail, authentic Chinese restaurant menu photo style, no people, no text, no cartoon, not an illustration`
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square`
}

@Injectable()
export class DishService {
  constructor(
    @InjectRepository(DishEntity)
    private readonly dishRepo: Repository<DishEntity>,
    @InjectRepository(SpecGroupEntity)
    private readonly groupRepo: Repository<SpecGroupEntity>,
    @InjectRepository(SpecOptionEntity)
    private readonly optionRepo: Repository<SpecOptionEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
  ) {}

  /** 供顾客端：在售/售罄菜品（含规格），支持分类/关键词过滤 */
  async listForCustomer(query: { categoryId?: string; keyword?: string }): Promise<DishDto[]> {
    const dishes = await this.dishRepo.find({ where: { status: In([1, 2]) } })
    return this.applyFilters(dishes, query)
  }

  /** 顾客端菜品详情 */
  async detailForCustomer(id: string): Promise<DishDto> {
    const dish = await this.dishRepo.findOne({ where: { id } })
    if (!dish || dish.status === 0) throw new BusinessException(404, '菜品不存在或已下架')
    const groups = await this.loadGroups([dish.id])
    return toDishDto(dish, groups.get(dish.id))
  }

  /** 后台菜品列表（含下架），按 sort 排序 */
  async listForAdmin(query: DishQueryDto): Promise<DishDto[]> {
    const dishes = await this.dishRepo.find()
    return this.applyFilters(dishes, query)
  }

  async create(dto: CreateDishDto): Promise<DishDto> {
    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } })
    if (!category) throw new BusinessException(422, '请选择有效分类')

    const count = await this.dishRepo.count()
    const dish = this.dishRepo.create({
      id: genId('d'),
      name: dto.name.trim(),
      imageUrl: dto.image?.trim() || defaultDishImage(dto.name),
      price: yuanToFen(dto.price),
      categoryId: dto.categoryId,
      description: dto.description?.trim() ?? '',
      sales: 0,
      rating: 4.5,
      status: dto.status ? STATUS_TO_DB[dto.status] : 1,
      isHot: dto.isHot ?? false,
      isSignature: dto.isSignature ?? category.id === 'sign',
      sort: dto.sort ?? count + 1,
    })
    await this.dishRepo.save(dish)
    return toDishDto(dish)
  }

  async update(id: string, dto: UpdateDishDto): Promise<DishDto> {
    const dish = await this.dishRepo.findOne({ where: { id } })
    if (!dish) throw new BusinessException(404, '菜品不存在')

    if (dto.categoryId !== undefined) {
      const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } })
      if (!category) throw new BusinessException(422, '分类不存在')
      dish.categoryId = dto.categoryId
    }
    if (dto.name !== undefined) dish.name = dto.name.trim()
    if (dto.price !== undefined) dish.price = yuanToFen(dto.price)
    if (dto.description !== undefined) dish.description = dto.description.trim()
    if (dto.image !== undefined && dto.image.trim()) dish.imageUrl = dto.image.trim()
    if (dto.status !== undefined) dish.status = STATUS_TO_DB[dto.status]
    if (dto.isHot !== undefined) dish.isHot = dto.isHot
    if (dto.isSignature !== undefined) dish.isSignature = dto.isSignature
    if (dto.sort !== undefined) dish.sort = dto.sort

    await this.dishRepo.save(dish)
    return toDishDto(dish)
  }

  /**
   * 整组替换规格：提交即全量覆盖（与表单式编辑天然契合，无需逐条增删接口）。
   * 先删旧组选项再删组（两表无 DB 级联，需按序手工清理）。
   */
  async replaceSpecs(id: string, dto: UpdateDishSpecsDto): Promise<DishDto> {
    const dish = await this.dishRepo.findOne({ where: { id } })
    if (!dish) throw new BusinessException(404, '菜品不存在')

    const oldGroups = await this.groupRepo.find({ where: { dishId: id } })
    if (oldGroups.length) {
      await this.optionRepo.delete({ groupId: In(oldGroups.map((g) => g.id)) })
      await this.groupRepo.delete({ dishId: id })
    }

    for (const [gi, group] of dto.specs.entries()) {
      const groupId = genId('sg')
      await this.groupRepo.save(
        this.groupRepo.create({ id: groupId, dishId: id, name: group.name.trim(), required: true, sort: gi + 1 }),
      )
      const options = group.options.map((option, oi) =>
        this.optionRepo.create({
          id: genId('so'),
          groupId,
          label: option.label.trim(),
          priceDelta: yuanToFen(option.priceDelta ?? 0),
          sort: oi + 1,
        }),
      )
      if (options.length) await this.optionRepo.save(options)
    }

    const groups = await this.loadGroups([id])
    return toDishDto(dish, groups.get(id))
  }

  async remove(id: string): Promise<boolean> {
    // 规格组随菜品级联清理
    await this.groupRepo.delete({ dishId: id })
    await this.dishRepo.delete(id)
    return true
  }

  /** 批量加载规格组（带选项），供 DTO 映射 */
  async loadGroups(dishIds: string[]): Promise<Map<string, SpecGroupEntity[]>> {
    const map = new Map<string, SpecGroupEntity[]>()
    if (!dishIds.length) return map
    const groups = await this.groupRepo.find({ where: { dishId: In(dishIds) }, relations: ['options'] })
    for (const group of groups) {
      const list = map.get(group.dishId) ?? []
      list.push(group)
      map.set(group.dishId, list)
    }
    return map
  }

  /** 统一过滤 + 排序 + 附规格（含 sort 升序） */
  private async applyFilters(dishes: DishEntity[], query: { categoryId?: string; keyword?: string; status?: string }): Promise<DishDto[]> {
    const keyword = query.keyword?.trim() ?? ''
    let list = dishes
    if (keyword) list = list.filter((d) => d.name.includes(keyword))
    if (query.categoryId) {
      // 「热门推荐」为虚拟分类：聚合 isHot 标记
      if (query.categoryId === 'hot') list = list.filter((d) => d.isHot)
      else list = list.filter((d) => d.categoryId === query.categoryId)
    }
    if (query.status) list = list.filter((d) => STATUS_FROM_DB[d.status] === query.status)

    list = [...list].sort((a, b) => a.sort - b.sort)
    const groups = await this.loadGroups(list.map((d) => d.id))
    return list.map((d) => toDishDto(d, groups.get(d.id)))
  }
}
