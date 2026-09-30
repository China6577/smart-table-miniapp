import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm'
import { DishEntity } from './dish.entity'
import { SpecOptionEntity } from './spec-option.entity'

/** 规格组（如：份量 / 辣度 / 温度） */
@Entity('dish_spec_group')
export class SpecGroupEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string

  @Column({ type: 'varchar', length: 32, name: 'dish_id' })
  dishId!: string

  @Column({ type: 'varchar', length: 16 })
  name!: string

  @Column({ type: 'boolean', default: true })
  required!: boolean

  @Column({ type: 'int', default: 0 })
  sort!: number

  @ManyToOne(() => DishEntity, (dish) => dish.specGroups)
  @JoinColumn({ name: 'dish_id' })
  dish?: DishEntity

  @OneToMany(() => SpecOptionEntity, (option) => option.group)
  options?: SpecOptionEntity[]
}
