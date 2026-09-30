import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { SpecGroupEntity } from './spec-group.entity'

/** 规格选项（如：大份 +1200 分） */
@Entity('dish_spec_option')
export class SpecOptionEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string

  @Column({ type: 'varchar', length: 32, name: 'group_id' })
  groupId!: string

  @Column({ type: 'varchar', length: 16 })
  label!: string

  /** 相对基础价的差价（分） */
  @Column({ type: 'int', default: 0, name: 'price_delta' })
  priceDelta!: number

  @Column({ type: 'int', default: 0 })
  sort!: number

  @ManyToOne(() => SpecGroupEntity, (group) => group.options)
  @JoinColumn({ name: 'group_id' })
  group?: SpecGroupEntity
}
