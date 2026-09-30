/**
 * 接口出入参类型（对齐后端契约，docs/01-系统设计.md 6.3 节）
 */

/** 统一响应包裹 */
export interface ApiResp<T> {
  code: number
  message: string
  data: T
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: import('./model').AuthUser
}

/** 仪表盘汇总 */
export interface DashboardSummary {
  /** 今日营业额（元） */
  todayRevenue: number
  /** 昨日营业额（元），用于环比 */
  yesterdayRevenue: number
  /** 今日有效订单数（不含取消） */
  todayOrderCount: number
  /** 今日平均客单价（元） */
  todayAvgAmount: number
  /** 待接单数量 */
  pendingCount: number
  /** 制作中数量 */
  cookingCount: number
  /** 今日热销菜品 Top5 */
  topDishes: Array<{ dishId: string; name: string; quantity: number; revenue: number }>
}

/** 按日趋势点 */
export interface TrendPoint {
  date: string
  revenue: number
  orderCount: number
}

/** 菜品销量排行项 */
export interface DishRankItem {
  dishId: string
  name: string
  quantity: number
  revenue: number
}

/** 时段销售项 */
export interface HourlyPoint {
  hour: number
  orderCount: number
  revenue: number
}

/** 分类销售占比项 */
export interface CategoryShareItem {
  categoryId: string
  name: string
  revenue: number
}

/** 区间经营概览（服务端口径，含上一周期环比） */
export interface OverviewStats {
  days: number
  revenue: number
  orderCount: number
  avgAmount: number
  cancelCount: number
  /** 取消率（%），保留一位小数 */
  cancelRate: number
  prevRevenue: number
  prevOrderCount: number
  /** 环比增幅（%）；上一周期为 0 时为 null（无基准不可比） */
  revenueGrowth: number | null
  orderGrowth: number | null
}

/** 桌台排行项 */
export interface TableRankItem {
  tableCode: string
  area: string
  orderCount: number
  revenue: number
}

/** 桌台分析汇总 */
export interface TableOverview {
  totalTables: number
  usedTables: number
  /** 使用率（%） */
  usageRate: number
  orderCount: number
  revenue: number
  /** 桌均消费（元） */
  avgTableAmount: number
  /** 翻台率（总订单数 / 使用桌数） */
  turnoverRate: number
  topTables: TableRankItem[]
}

/** 订单分页查询参数 */
export interface OrderQuery {
  status?: '' | import('./model').OrderStatus
  date?: string
  keyword?: string
  page: number
  pageSize: number
}

export interface OrderPage {
  list: import('./model').Order[]
  total: number
  page: number
  pageSize: number
}
