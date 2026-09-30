import { Controller, Get, Query } from '@nestjs/common'
import { Roles } from '../../common/roles.decorator'
import { StatsService } from './stats.service'
import { DateRangeDto, DishRankingQueryDto, HourlyQueryDto, TableOverviewQueryDto } from './stats.dto'

/** 商家端数据分析（契约见 docs/01-系统设计.md 6.3 节） */
@Roles('admin', 'manager')
@Controller('admin')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard/summary')
  summary() {
    return this.statsService.summary()
  }

  @Get('stats/overview')
  overview(@Query() query: DateRangeDto) {
    return this.statsService.overview(query.from, query.to)
  }

  @Get('stats/table-overview')
  tableOverview(@Query() query: TableOverviewQueryDto) {
    return this.statsService.tableOverview(query.from, query.to, query.limit ?? 10)
  }

  @Get('stats/sales-trend')
  salesTrend(@Query() query: DateRangeDto) {
    return this.statsService.salesTrend(query.from, query.to)
  }

  @Get('stats/dish-ranking')
  dishRanking(@Query() query: DishRankingQueryDto) {
    return this.statsService.dishRanking(query.from, query.to, query.limit ?? 10)
  }

  @Get('stats/hourly')
  hourly(@Query() query: HourlyQueryDto) {
    return this.statsService.hourly(query)
  }

  @Get('stats/category-share')
  categoryShare(@Query() query: DateRangeDto) {
    return this.statsService.categoryShare(query.from, query.to)
  }
}
