import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator'

export class CreateStaffDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,20}$/, { message: '用户名需为 3-20 位字母/数字/下划线' })
  username!: string

  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  @MaxLength(32)
  name!: string

  @IsIn(['admin', 'manager', 'waiter', 'kitchen'], { message: '角色不合法' })
  role!: string

  /** 初始密码：缺省 123456（创建后可由管理员重置） */
  @IsOptional()
  @IsString()
  @Length(6, 32, { message: '密码长度需为 6-32 位' })
  password?: string

  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1
}

/** 局部更新：PUT 允许省略任意字段 */
export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  @MaxLength(32)
  name?: string

  @IsOptional()
  @IsIn(['admin', 'manager', 'waiter', 'kitchen'], { message: '角色不合法' })
  role?: string

  @IsOptional()
  @IsString()
  @Length(6, 32, { message: '密码长度需为 6-32 位' })
  password?: string

  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1
}
