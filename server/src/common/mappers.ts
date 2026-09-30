/**
 * 实体 → 接口 DTO 映射：
 * - 金额 分 → 元；时间 Date → 毫秒时间戳（前端契约）
 * - 字段名与 apps/admin/src/types/model.ts、apps/miniprogram/types/model.ts 完全对齐
 */
import type { CategoryEntity } from '../database/entities/category.entity'
import type { DiningTableEntity } from '../database/entities/dining-table.entity'
import type { DishEntity } from '../database/entities/dish.entity'
import type { SpecGroupEntity, SpecOptionEntity } from '../database/entities'
import type { OrderEntity, OrderItemEntity } from '../database/entities'
import type { StaffEntity } from '../database/entities/staff.entity'
import { fenToYuan } from '../utils/money'

function toMs(value: Date | null | undefined): number | undefined {
  return value ? new Date(value).getTime() : undefined
}

export interface DishDto {
  id: string
  name: string
  image: string
  price: number
  categoryId: string
  description: string
  sales: number
  rating: number
  status: 'on' | 'off' | 'soldout'
  isHot: boolean
  isSignature: boolean
  sort: number
  specs?: SpecGroupDto[]
}

export interface SpecOptionDto {
  id: string
  label: string
  /** 相对基础价的差价（元） */
  priceDelta: number
}

export interface SpecGroupDto {
  id: string
  name: string
  options: SpecOptionDto[]
}

export function toDishDto(dish: DishEntity, groups?: SpecGroupEntity[]): DishDto {
  const dto: DishDto = {
    id: dish.id,
    name: dish.name,
    image: dish.imageUrl,
    price: fenToYuan(dish.price),
    categoryId: dish.categoryId,
    description: dish.description ?? '',
    sales: dish.sales,
    rating: dish.rating,
    status: dish.status === 1 ? 'on' : dish.status === 0 ? 'off' : 'soldout',
    isHot: dish.isHot,
    isSignature: dish.isSignature,
    sort: dish.sort,
  }
  if (groups?.length) {
    dto.specs = groups
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .map((group) => ({
        id: group.id,
        name: group.name,
        options: (group.options ?? [])
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .map((option: SpecOptionEntity) => ({
            id: option.id,
            label: option.label,
            priceDelta: fenToYuan(option.priceDelta),
          })),
      }))
  }
  return dto
}

export function toCategoryDto(category: CategoryEntity): { id: string; name: string; sort: number; status: 0 | 1 } {
  return { id: category.id, name: category.name, sort: category.sort, status: category.status === 1 ? 1 : 0 }
}

export function toTableDto(table: DiningTableEntity): { id: string; code: string; area: string; capacity: number; status: 0 | 1 } {
  return { id: table.id, code: table.code, area: table.area, capacity: table.capacity, status: table.status === 1 ? 1 : 0 }
}

export function toStaffDto(staff: StaffEntity): {
  id: string
  username: string
  name: string
  role: string
  status: 0 | 1
  createdAt: number
} {
  return {
    id: staff.id,
    username: staff.username,
    name: staff.name,
    role: staff.role,
    status: staff.status === 1 ? 1 : 0,
    createdAt: new Date(staff.createdAt).getTime(),
  }
}

export function toOrderItemDto(item: OrderItemEntity): {
  key: string
  dishId: string
  name: string
  image?: string
  specText?: string
  unitPrice: number
  quantity: number
  subtotal: number
} {
  return {
    key: item.specText ? `${item.dishId}#${item.specText}` : item.dishId ?? item.id,
    dishId: item.dishId ?? '',
    name: item.dishName,
    image: item.imageUrl ?? undefined,
    specText: item.specText ?? undefined,
    unitPrice: fenToYuan(item.unitPrice),
    quantity: item.quantity,
    subtotal: fenToYuan(item.subtotal),
  }
}

export function toOrderDto(order: OrderEntity): {
  orderNo: string
  tableCode: string
  items: ReturnType<typeof toOrderItemDto>[]
  itemCount: number
  totalAmount: number
  remark: string
  status: string
  createdAt: number
  acceptedAt?: number
  cookingAt?: number
  readyAt?: number
  completedAt?: number
  cancelledAt?: number
  cancelReason?: string
} {
  return {
    orderNo: order.orderNo,
    tableCode: order.tableCode,
    items: (order.items ?? []).map(toOrderItemDto),
    itemCount: order.itemCount,
    totalAmount: fenToYuan(order.totalAmount),
    remark: order.remark ?? '',
    status: order.status,
    createdAt: new Date(order.createdAt).getTime(),
    acceptedAt: toMs(order.acceptedAt),
    cookingAt: toMs(order.cookingAt),
    readyAt: toMs(order.readyAt),
    completedAt: toMs(order.completedAt),
    cancelledAt: toMs(order.cancelledAt),
    cancelReason: order.cancelReason ?? undefined,
  }
}
