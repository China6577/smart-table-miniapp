import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min, ValidateNested } from 'class-validator'

/** 菜品上架状态 */
export type DishStatusInput = 'on' | 'off' | 'soldout'

export class DishQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @IsIn(['on', 'off', 'soldout', ''])
  status?: string
}

export class CreateDishDto {
  @IsString()
  @IsNotEmpty({ message: '菜品名称不能为空' })
  @MaxLength(32)
  name!: string

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '价格必须大于 0' })
  price!: number

  @IsString()
  @IsNotEmpty({ message: '请选择分类' })
  categoryId!: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(512)
  image?: string

  @IsOptional()
  @IsIn(['on', 'off', 'soldout'])
  status?: DishStatusInput

  @IsOptional()
  @IsBoolean()
  isHot?: boolean

  @IsOptional()
  @IsBoolean()
  isSignature?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number
}

export class UpdateDishDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '菜品名称不能为空' })
  @MaxLength(32)
  name?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '价格必须大于 0' })
  price?: number

  @IsOptional()
  @IsString()
  categoryId?: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  description?: string

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: '图片地址不合法' })
  @MaxLength(512)
  image?: string

  @IsOptional()
  @IsIn(['on', 'off', 'soldout'])
  status?: DishStatusInput

  @IsOptional()
  @IsBoolean()
  isHot?: boolean

  @IsOptional()
  @IsBoolean()
  isSignature?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number
}

/** 规格选项输入（priceDelta 单位：元，正数为加价） */
export class SpecOptionInputDto {
  @IsString()
  @IsNotEmpty({ message: '选项名称不能为空' })
  @MaxLength(16)
  label!: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: '差价不能为负' })
  priceDelta?: number
}

/** 规格组输入（如：份量 / 辣度 / 温度） */
export class SpecGroupInputDto {
  @IsString()
  @IsNotEmpty({ message: '规格组名称不能为空' })
  @MaxLength(16)
  name!: string

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SpecOptionInputDto)
  options!: SpecOptionInputDto[]
}

/** 整组替换菜品规格：提交即全量覆盖（前端表单一次性保存） */
export class UpdateDishSpecsDto {
  @IsArray()
  @ArrayMaxSize(5, { message: '规格组最多 5 个' })
  @ValidateNested({ each: true })
  @Type(() => SpecGroupInputDto)
  specs!: SpecGroupInputDto[]
}

export class CategoryPayloadDto {
  @IsString()
  @IsNotEmpty({ message: '分类名称不能为空' })
  @MaxLength(16)
  name!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number

  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1
}
