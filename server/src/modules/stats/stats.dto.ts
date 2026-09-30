import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator'

/** 日期范围 YYYY-MM-DD（含起止日） */
export class DateRangeDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from 需为 YYYY-MM-DD' })
  from!: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to 需为 YYYY-MM-DD' })
  to!: string
}

/** 时段查询：date 单日（旧契约）或 from+to 区间（区间内日均）二选一 */
export class HourlyQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date 需为 YYYY-MM-DD' })
  date?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from 需为 YYYY-MM-DD' })
  from?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to 需为 YYYY-MM-DD' })
  to?: string
}

export class DishRankingQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from 需为 YYYY-MM-DD' })
  from!: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to 需为 YYYY-MM-DD' })
  to!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number
}

export class TableOverviewQueryDto extends DishRankingQueryDto {}
