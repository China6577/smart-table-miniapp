import { Type } from 'class-transformer'
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator'

export class TablePayloadDto {
  @IsString()
  @IsNotEmpty({ message: '桌号不能为空' })
  @Matches(/^[A-Za-z]\d{1,2}$/, { message: '桌号格式应为字母+数字，如 A01' })
  code!: string

  @IsOptional()
  @IsString()
  @MaxLength(16)
  area?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '可坐人数应在 1-30 之间' })
  @Max(30, { message: '可坐人数应在 1-30 之间' })
  capacity?: number

  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1
}

/** 局部更新：PUT 允许省略任意字段 */
export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]\d{1,2}$/, { message: '桌号格式应为字母+数字，如 A01' })
  code?: string

  @IsOptional()
  @IsString()
  @MaxLength(16)
  area?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '可坐人数应在 1-30 之间' })
  @Max(30, { message: '可坐人数应在 1-30 之间' })
  capacity?: number

  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1
}
