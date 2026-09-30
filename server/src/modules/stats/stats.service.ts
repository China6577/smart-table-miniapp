import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BusinessException } from '../../common/business.exception'
import { CategoryEntity } from '../../database/entities/category.entity'
import { DiningTableEntity } from '../../database/entities/dining-table.entity'
import { DishEntity } from '../../database/entities/dish.entity'
import { OrderEntity } from '../../database/entities/order.entity'
import { fenToYuan } from '../../utils/money'

/**
 * 统计分析（口径与前端 Mock 保持一致）：
 * 营业额 = 有效订单（不含已取消）实付金额；金额分 → 元。
 */
@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(DishEntity)
    private readonly dishRepo: Repository<DishEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(DiningTableEntity)
    private readonly tableRepo: Repository<DiningTableEntity>,
  ) {}

  /** Dashboard 汇总：今日营业额/订单数/客单价/在途数量/热销 Top5 */
  async summary() {
    const todayTs = startOfTodayTs()
    const yesterdayTs = todayTs - 86_400_000
    // 近两日订单足够覆盖汇总口径，避免全表加载
    const all = await this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .where('o.createdAt >= :from', { from: new Date(yesterdayTs) })
      .getMany()

    const todays = all.filter((o) => new Date(o.createdAt).getTime() >= todayTs)
    const valid = todays.filter((o) => o.status !== 'CANCELLED')

    const revenue = valid.reduce((sum, o) => sum + o.totalAmount, 0)
    const yesterdayRevenue = all
      .filter((o) => o.status !== 'CANCELLED')
      .filter((o) => {
        const ts = new Date(o.createdAt).getTime()
        return ts >= yesterdayTs && ts < todayTs
      })
      .reduce((sum, o) => sum + o.totalAmount, 0)

    const topDishes = this.aggregateDishRanking(valid, 5)

    return {
      todayRevenue: fenToYuan(revenue),
      yesterdayRevenue: fenToYuan(yesterdayRevenue),
      todayOrderCount: valid.length,
      todayAvgAmount: valid.length > 0 ? fenToYuan(Math.round(revenue / valid.length)) : 0,
      pendingCount: todays.filter((o) => o.status === 'PENDING').length,
      cookingCount: todays.filter((o) => o.status === 'COOKING').length,
      topDishes,
    }
  }

  /** 区间经营概览：核心指标 + 与上一等长周期的环比 */
  async overview(from: string, to: string) {
    const { fromTs, toTs } = this.parseRange(from, to)
    const days = Math.max(1, Math.round((toTs - fromTs) / 86_400_000))
    // 一次拉取覆盖本周期 + 上一周期，环比口径完全一致
    const all = await this.loadValid(fromTs - (toTs - fromTs), toTs)
    const inWindow = (o: OrderEntity, start: number, end: number) => {
      const ts = new Date(o.createdAt).getTime()
      return ts >= start && ts < end
    }
    const current = all.filter((o) => inWindow(o, fromTs, toTs))
    const previous = all.filter((o) => inWindow(o, fromTs - (toTs - fromTs), fromTs))

    const revenue = current.reduce((sum, o) => sum + o.totalAmount, 0)
    const prevRevenue = previous.reduce((sum, o) => sum + o.totalAmount, 0)
    const orderCount = current.length
    const prevOrderCount = previous.length
    const cancelled = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt >= :from AND o.createdAt < :to', { from: new Date(fromTs), to: new Date(toTs) })
      .andWhere('o.status = :status', { status: 'CANCELLED' })
      .getCount()
    const totalCount = orderCount + cancelled

    return {
      days,
      revenue: fenToYuan(revenue),
      orderCount,
      avgAmount: orderCount > 0 ? fenToYuan(Math.round(revenue / orderCount)) : 0,
      cancelCount: cancelled,
      cancelRate: totalCount > 0 ? Math.round((cancelled / totalCount) * 1000) / 10 : 0,
      prevRevenue: fenToYuan(prevRevenue),
      prevOrderCount,
      /** 环比增幅（%），上一周期为 0 时返回 null（无基准不可比） */
      revenueGrowth: prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : null,
      orderGrowth: prevOrderCount > 0 ? Math.round(((orderCount - prevOrderCount) / prevOrderCount) * 1000) / 10 : null,
    }
  }

  /** 桌台分析：使用率、桌均消费、翻台率与 Top 桌台（餐饮排班/营销核心依据） */
  async tableOverview(from: string, to: string, limit = 10) {
    const { fromTs, toTs } = this.parseRange(from, to)
    const [orders, tables] = await Promise.all([
      this.loadValid(fromTs, toTs),
      this.tableRepo.find({ where: { status: 1 } }),
    ])
    const tableMap = new Map(tables.map((t) => [t.code, t]))
    const statByTable = new Map<string, { tableCode: string; area: string; orderCount: number; revenue: number }>()
    for (const order of orders) {
      const entry =
        statByTable.get(order.tableCode) ??
        { tableCode: order.tableCode, area: tableMap.get(order.tableCode)?.area ?? '未知区域', orderCount: 0, revenue: 0 }
      entry.orderCount += 1
      entry.revenue += order.totalAmount
      statByTable.set(order.tableCode, entry)
    }

    const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    const used = statByTable.size
    const topTables = [...statByTable.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((t) => ({ ...t, revenue: fenToYuan(t.revenue) }))

    return {
      totalTables: tables.length,
      usedTables: used,
      /** 桌台使用率（%） */
      usageRate: tables.length > 0 ? Math.round((used / tables.length) * 1000) / 10 : 0,
      orderCount: orders.length,
      revenue: fenToYuan(revenue),
      /** 桌均消费：营业额 / 有订单的桌数 */
      avgTableAmount: used > 0 ? fenToYuan(Math.round(revenue / used)) : 0,
      /** 翻台率 = 总订单数 / 使用桌数（一桌多单即翻台） */
      turnoverRate: used > 0 ? Math.round((orders.length / used) * 10) / 10 : 0,
      topTables,
    }
  }

  /** 按日营业额/订单趋势（含起止日） */
  async salesTrend(from: string, to: string) {
    const { fromTs, toTs } = this.parseRange(from, to)
    const orders = await this.loadValid(fromTs, toTs)

    const points: Array<{ date: string; revenue: number; orderCount: number }> = []
    for (let ts = startOfDay(fromTs); ts < toTs; ts += 86_400_000) {
      const dayOrders = orders.filter((o) => {
        const t = new Date(o.createdAt).getTime()
        return t >= ts && t < ts + 86_400_000
      })
      points.push({
        date: new Date(ts).toISOString().slice(0, 10),
        revenue: fenToYuan(dayOrders.reduce((sum, o) => sum + o.totalAmount, 0)),
        orderCount: dayOrders.length,
      })
    }
    return points
  }

  /** 菜品销量排行（按数量降序） */
  async dishRanking(from: string, to: string, limit: number) {
    const { fromTs, toTs } = this.parseRange(from, to)
    const orders = await this.loadValid(fromTs, toTs)
    return this.aggregateDishRanking(orders, limit)
  }

  /**
   * 时段销售分析（24 小时分布）：
   * - date 单日：当日每小时
   * - from+to 区间：区间内日均每小时（一次请求替代前端逐日循环）
   */
  async hourly(input: { date?: string; from?: string; to?: string }) {
    let fromTs: number
    let toTs: number
    let days: number
    if (input.from && input.to) {
      const range = this.parseRange(input.from, input.to)
      fromTs = range.fromTs
      toTs = range.toTs
      days = Math.max(1, Math.round((toTs - fromTs) / 86_400_000))
    } else if (input.date) {
      fromTs = dateStrToTs(input.date)
      toTs = fromTs + 86_400_000
      days = 1
    } else {
      throw new BusinessException(422, '需提供 date 或 from+to 查询参数')
    }
    const orders = await this.loadValid(fromTs, toTs)

    const points = Array.from({ length: 24 }, (_, hour) => ({ hour, orderCount: 0, revenue: 0 }))
    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours()
      points[hour].orderCount += 1
      points[hour].revenue += order.totalAmount
    }
    // 区间模式输出日均：订单量取整、金额四舍五入到分再转元
    return points.map((p) => ({
      hour: p.hour,
      orderCount: Math.round(p.orderCount / days),
      revenue: fenToYuan(Math.round(p.revenue / days)),
    }))
  }

  /** 分类销售占比 */
  async categoryShare(from: string, to: string) {
    const { fromTs, toTs } = this.parseRange(from, to)
    const orders = await this.loadValid(fromTs, toTs)
    const [dishes, categories] = await Promise.all([this.dishRepo.find(), this.categoryRepo.find()])

    const dishMap = new Map(dishes.map((d) => [d.id, d.categoryId]))
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
    const revenueByCategory = new Map<string, number>()

    for (const order of orders) {
      for (const item of order.items ?? []) {
        const cat = dishMap.get(item.dishId ?? '') ?? 'other'
        revenueByCategory.set(cat, (revenueByCategory.get(cat) ?? 0) + item.subtotal)
      }
    }

    return [...revenueByCategory.entries()]
      .map(([categoryId, fen]) => ({
        categoryId,
        name: categoryMap.get(categoryId) ?? '其他',
        revenue: fenToYuan(fen),
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }

  // ---------------- 内部工具 ----------------

  private aggregateDishRanking(orders: OrderEntity[], limit: number) {
    const map = new Map<string, { dishId: string; name: string; quantity: number; revenue: number }>()
    for (const order of orders) {
      for (const item of order.items ?? []) {
        const entry = map.get(item.dishId ?? item.id) ?? {
          dishId: item.dishId ?? '',
          name: item.dishName,
          quantity: 0,
          revenue: 0,
        }
        entry.quantity += item.quantity
        entry.revenue = Math.round(entry.revenue + item.subtotal)
        map.set(item.dishId ?? item.id, entry)
      }
    }
    return [...map.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit)
      .map((entry) => ({ ...entry, revenue: fenToYuan(entry.revenue) }))
  }

  private async loadValid(fromTs: number, toTs: number): Promise<OrderEntity[]> {
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .where('o.createdAt >= :from AND o.createdAt < :to', { from: new Date(fromTs), to: new Date(toTs) })
      .getMany()
    return orders.filter((o) => o.status !== 'CANCELLED')
  }

  private parseRange(from: string, to: string): { fromTs: number; toTs: number } {
    const fromTs = dateStrToTs(from)
    const toTs = dateStrToTs(to) + 86_400_000
    if (!(toTs > fromTs)) throw new BusinessException(422, '日期范围不合法')
    return { fromTs, toTs }
  }
}

/** YYYY-MM-DD → 当日 0 点时间戳（服务器本地时区） */
function dateStrToTs(date: string): number {
  const ts = new Date(`${date}T00:00:00`).getTime()
  if (!Number.isFinite(ts)) throw new BusinessException(422, '日期格式不合法')
  return ts
}

function startOfTodayTs(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
