import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { OrderItemEntity } from './order-item.entity'
import { OrderEventEntity } from './order-event.entity'
import type { OrderStatus } from '../../utils/order-status'

/** 订单主表（金额以「分」存储；状态机见 docs/01-系统设计.md 8.3 节） */
@Entity('order_info')
export class OrderEntity {
  @PrimaryColumn({ type: 'varchar', length: 24 })
  id!: string

  /** 订单号：YYYYMMDD + 4 位当日流水 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, name: 'order_no' })
  orderNo!: string

  @Column({ type: 'varchar', length: 32, name: 'table_id' })
  tableId!: string

  /** 桌号快照（桌台后续改名不影响历史订单展示） */
  @Index()
  @Column({ type: 'varchar', length: 8, name: 'table_code' })
  tableCode!: string

  @Index()
  @Column({ type: 'varchar', length: 16 })
  status!: OrderStatus

  @Column({ type: 'int', name: 'total_amount' })
  totalAmount!: number

  @Column({ type: 'int', name: 'item_count' })
  itemCount!: number

  @Column({ type: 'varchar', length: 128, nullable: true })
  remark!: string | null

  /** 下单幂等令牌 */
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'client_token' })
  clientToken!: string | null

  /** 经手员工 */
  @Column({ type: 'varchar', length: 32, nullable: true, name: 'handler_id' })
  handlerId!: string | null

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'cancel_reason' })
  cancelReason!: string | null

  /** 匿名顾客标识（微信 openid，预留） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  openid!: string | null

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @Column({ type: 'timestamp', nullable: true, name: 'accepted_at' })
  acceptedAt!: Date | null

  @Column({ type: 'timestamp', nullable: true, name: 'cooking_at' })
  cookingAt!: Date | null

  @Column({ type: 'timestamp', nullable: true, name: 'ready_at' })
  readyAt!: Date | null

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt!: Date | null

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt!: Date | null

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
  items?: OrderItemEntity[]

  @OneToMany(() => OrderEventEntity, (event) => event.order, { cascade: true })
  events?: OrderEventEntity[]
}
