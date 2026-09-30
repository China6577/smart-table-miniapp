import { StaffEntity } from './staff.entity'
import { DiningTableEntity } from './dining-table.entity'
import { CategoryEntity } from './category.entity'
import { DishEntity } from './dish.entity'
import { SpecGroupEntity } from './spec-group.entity'
import { SpecOptionEntity } from './spec-option.entity'
import { OrderEntity } from './order.entity'
import { OrderItemEntity } from './order-item.entity'
import { OrderEventEntity } from './order-event.entity'

/** 全部实体注册表（TypeORM forRoot 使用） */
export const entities = [
  StaffEntity,
  DiningTableEntity,
  CategoryEntity,
  DishEntity,
  SpecGroupEntity,
  SpecOptionEntity,
  OrderEntity,
  OrderItemEntity,
  OrderEventEntity,
]

export {
  StaffEntity,
  DiningTableEntity,
  CategoryEntity,
  DishEntity,
  SpecGroupEntity,
  SpecOptionEntity,
  OrderEntity,
  OrderItemEntity,
  OrderEventEntity,
}
