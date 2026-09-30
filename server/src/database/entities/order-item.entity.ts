import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { OrderEntity } from './order.entity'

/** 订单明细（名称/价格为下单时快照，菜品后续修改不影响历史订单） */
@Entity('order_item')
export class OrderItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string

  @Column({ type: 'varchar', length: 24, name: 'order_id' })
  orderId!: string

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'dish_id' })
  dishId!: string | null

  @Column({ type: 'varchar', length: 32, name: 'dish_name' })
  dishName!: string

  @Column({ type: 'varchar', length: 1024, nullable: true, name: 'image_url' })
  imageUrl!: string | null

  /** 规格描述，如「大份 / 特辣」 */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'spec_text' })
  specText!: string | null

  /** 单价（分，含规格差价） */
  @Column({ type: 'int', name: 'unit_price' })
  unitPrice!: number

  @Column({ type: 'int' })
  quantity!: number

  @Column({ type: 'int' })
  subtotal!: number

  @ManyToOne(() => OrderEntity, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order?: OrderEntity
}
