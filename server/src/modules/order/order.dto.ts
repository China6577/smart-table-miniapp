import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator'

/** 顾客下单条目（对齐小程序 CartItem 结构） */
export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty({ message: '菜品不能为空' })
  dishId!: string

  /** 数量（小程序购物车字段名为 count） */
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '数量至少为 1' })
  @Max(50, { message: '单条数量不能超过 50' })
  count!: number

  /** 含规格差价的单价（元）；无规格时服务端按数据库价格权威定价 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number

  @IsOptional()
  @IsString()
  @MaxLength(64)
  specText?: string
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty({ message: '桌号不能为空' })
  tableCode!: string

  @IsArray()
  @ArrayMinSize(1, { message: '购物车为空，无法下单' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[]

  @IsOptional()
  @IsString()
  @MaxLength(128)
  remark?: string

  /** 下单幂等令牌：重复提交返回同一订单 */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientToken?: string
}

export class OrderQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'ACCEPTED', 'COOKING', 'READY', 'COMPLETED', 'CANCELLED'])
  status?: string

  /** 日期过滤 YYYY-MM-DD */
  @IsOptional()
  @IsString()
  date?: string

  /** 订单号 / 桌号模糊搜索 */
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  pageSize?: number
}

export class TransitionDto {
  @IsIn(['ACCEPTED', 'COOKING', 'READY', 'COMPLETED', 'CANCELLED'], { message: '非法的目标状态' })
  to!: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  reason?: string
}

export class CancelDto {
  @IsString()
  @IsNotEmpty({ message: '取消订单必须填写原因' })
  @MaxLength(64)
  reason!: string
}
