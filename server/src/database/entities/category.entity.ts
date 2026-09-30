import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

/** 菜品分类 */
@Entity('category')
export class CategoryEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string

  @Column({ type: 'varchar', length: 16 })
  name!: string

  /** 展示排序（小在前） */
  @Column({ type: 'int', default: 0 })
  sort!: number

  /** 1 启用 / 0 停用 */
  @Column({ type: 'smallint', default: 1 })
  status!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
