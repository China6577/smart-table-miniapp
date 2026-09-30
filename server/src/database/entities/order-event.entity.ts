import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { OrderEntity } from './order.entity'

/** 订单状态流转审计 */
@Entity('order_event')
export class OrderEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string

  @Column({ type: 'varchar', length: 24, name: 'order_id' })
  orderId!: string

  @Column({ type: 'varchar', length: 16, nullable: true, name: 'from_status' })
  fromStatus!: string | null

  @Column({ type: 'varchar', length: 16, name: 'to_status' })
  toStatus!: string

  /** 操作人：员工姓名 / customer */
  @Column({ type: 'varchar', length: 32 })
  operator!: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @ManyToOne(() => OrderEntity, (order) => order.events)
  @JoinColumn({ name: 'order_id' })
  order?: OrderEntity
}
