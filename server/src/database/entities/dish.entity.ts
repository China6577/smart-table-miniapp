import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { SpecGroupEntity } from './spec-group.entity'

/** 菜品（金额以「分」存储） */
@Entity('dish')
export class DishEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string

  @Column({ type: 'varchar', length: 32, name: 'category_id' })
  categoryId!: string

  @Column({ type: 'varchar', length: 32 })
  name!: string

  /** 菜品图（真实食物摄影 URL 较长，允许 1024） */
  @Column({ type: 'varchar', length: 1024, name: 'image_url' })
  imageUrl!: string

  /** 基础价格（分） */
  @Column({ type: 'int' })
  price!: number

  @Column({ type: 'varchar', length: 128, default: '' })
  description!: string

  /** 累计销量 */
  @Column({ type: 'int', default: 0 })
  sales!: number

  /** 评分 1-5 */
  @Column({ type: 'real', default: 4.5 })
  rating!: number

  /** 1 在售 / 0 下架 / 2 售罄 */
  @Column({ type: 'smallint', default: 1 })
  status!: number

  @Column({ type: 'boolean', default: false, name: 'is_hot' })
  isHot!: boolean

  @Column({ type: 'boolean', default: false, name: 'is_signature' })
  isSignature!: boolean

  @Column({ type: 'int', default: 0 })
  sort!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date

  @OneToMany(() => SpecGroupEntity, (group) => group.dish)
  specGroups?: SpecGroupEntity[]
}
