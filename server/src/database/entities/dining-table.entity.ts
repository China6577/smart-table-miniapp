import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

/** 餐桌（桌码二维码绑定单元） */
@Entity('dining_table')
export class DiningTableEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string

  /** 桌号编码，如 A01 / B12 */
  @Column({ type: 'varchar', length: 8, unique: true })
  code!: string

  /** 大厅 / 包间 */
  @Column({ type: 'varchar', length: 16, default: '大厅' })
  area!: string

  @Column({ type: 'smallint', default: 4 })
  capacity!: number

  /** 桌码二维码（演示存 data URL，内容较大用 text） */
  @Column({ type: 'text', nullable: true, name: 'qr_code_url' })
  qrCodeUrl!: string | null

  /** 1 启用 / 0 停用 */
  @Column({ type: 'smallint', default: 1 })
  status!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
