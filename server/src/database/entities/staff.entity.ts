import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

/** 员工账号（后台登录，RBAC 角色见 docs/01-系统设计.md 9 节） */
@Entity('staff')
export class StaffEntity {
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string

  @Column({ type: 'varchar', length: 32, unique: true })
  username!: string

  /** bcrypt 哈希，永不出参 */
  @Column({ type: 'varchar', length: 128, name: 'password_hash' })
  passwordHash!: string

  @Column({ type: 'varchar', length: 32 })
  name!: string

  /** admin / manager / waiter / kitchen */
  @Column({ type: 'varchar', length: 16 })
  role!: string

  /** 1 启用 / 0 禁用 */
  @Column({ type: 'smallint', default: 1 })
  status!: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date
}
