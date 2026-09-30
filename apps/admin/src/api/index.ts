/** 各业务域接口统一管理（契约见 docs/01-系统设计.md 6.3 节） */
import type { AuthUser, Category, DiningTable, Dish, Order, OrderStatus, Staff, StaffRole } from '@/types/model'
import type {
  CategoryShareItem,
  DashboardSummary,
  DishRankItem,
  HourlyPoint,
  LoginResult,
  OrderPage,
  OverviewStats,
  TableOverview,
  TrendPoint,
} from '@/types/api'
import { request } from './request'

// ---------------- 认证 ----------------

export const authApi = {
  login: (username: string, password: string) =>
    request<LoginResult>('POST', '/admin/auth/login', { data: { username, password } }),
  me: () => request<AuthUser>('GET', '/admin/auth/me'),
}

// ---------------- 仪表盘 ----------------

export const dashboardApi = {
  summary: () => request<DashboardSummary>('GET', '/admin/dashboard/summary'),
}

// ---------------- 订单 ----------------

export interface OrderQueryParams {
  status?: OrderStatus | ''
  date?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export const orderApi = {
  page: (params: OrderQueryParams) => request<OrderPage>('GET', '/admin/orders', { params }),
  detail: (orderNo: string) => request<Order>('GET', `/admin/orders/${orderNo}`),
  accept: (orderNo: string) => request<Order>('POST', `/admin/orders/${orderNo}/accept`),
  /** KDS：待制作直接开始（PENDING 自动接单） */
  start: (orderNo: string) => request<Order>('POST', `/admin/orders/${orderNo}/start`),
  finish: (orderNo: string) => request<Order>('POST', `/admin/orders/${orderNo}/finish`),
  serve: (orderNo: string) => request<Order>('POST', `/admin/orders/${orderNo}/serve`),
  cancel: (orderNo: string, reason: string) => request<Order>('POST', `/admin/orders/${orderNo}/cancel`, { data: { reason } }),
  transition: (orderNo: string, to: OrderStatus, reason?: string) =>
    request<Order>('POST', `/admin/orders/${orderNo}/status`, { data: { to, reason } }),
}

// ---------------- 菜品 ----------------

export interface DishQueryParams {
  keyword?: string
  categoryId?: string
  status?: Dish['status'] | ''
}

export interface DishPayload {
  name: string
  price: number
  categoryId: string
  description?: string
  image?: string
  status?: Dish['status']
  isHot?: boolean
  isSignature?: boolean
  sort?: number
}

/** 规格载荷（整组替换）：priceDelta 单位元 */
export interface DishSpecPayload {
  name: string
  options: Array<{ label: string; priceDelta: number }>
}

export const dishApi = {
  list: (params: DishQueryParams = {}) => request<Dish[]>('GET', '/admin/dishes', { params }),
  create: (data: DishPayload) => request<Dish>('POST', '/admin/dishes', { data }),
  update: (id: string, data: Partial<DishPayload>) => request<Dish>('PUT', `/admin/dishes/${id}`, { data }),
  /** 整组替换规格：提交即全量覆盖，空数组 = 清除全部规格 */
  updateSpecs: (id: string, specs: DishSpecPayload[]) =>
    request<Dish>('PUT', `/admin/dishes/${id}/specs`, { data: { specs } }),
  remove: (id: string) => request<boolean>('DELETE', `/admin/dishes/${id}`),
}

// ---------------- 分类 ----------------

export interface CategoryPayload {
  name: string
  sort?: number
  status?: 0 | 1
}

export const categoryApi = {
  list: () => request<Category[]>('GET', '/admin/categories'),
  create: (data: CategoryPayload) => request<Category>('POST', '/admin/categories', { data }),
  update: (id: string, data: Partial<CategoryPayload>) => request<Category>('PUT', `/admin/categories/${id}`, { data }),
  remove: (id: string) => request<boolean>('DELETE', `/admin/categories/${id}`),
}

// ---------------- 桌号 ----------------

export interface TablePayload {
  code: string
  area?: string
  capacity?: number
  status?: 0 | 1
}

export const tableApi = {
  list: () => request<DiningTable[]>('GET', '/admin/tables'),
  create: (data: TablePayload) => request<DiningTable>('POST', '/admin/tables', { data }),
  update: (id: string, data: Partial<TablePayload>) => request<DiningTable>('PUT', `/admin/tables/${id}`, { data }),
  remove: (id: string) => request<boolean>('DELETE', `/admin/tables/${id}`),
}

// ---------------- 员工 ----------------

export interface StaffPayload {
  username?: string
  name: string
  role: StaffRole
  status?: 0 | 1
}

export const staffApi = {
  list: () => request<Staff[]>('GET', '/admin/staff'),
  create: (data: StaffPayload & { username: string }) => request<Staff>('POST', '/admin/staff', { data }),
  update: (id: string, data: Partial<StaffPayload>) => request<Staff>('PUT', `/admin/staff/${id}`, { data }),
  remove: (id: string) => request<boolean>('DELETE', `/admin/staff/${id}`),
}

// ---------------- 数据分析 ----------------

export interface StatsRange {
  from: string
  to: string
}

export const statsApi = {
  overview: ({ from, to }: StatsRange) => request<OverviewStats>('GET', '/admin/stats/overview', { params: { from, to } }),
  tableOverview: ({ from, to }: StatsRange, limit = 10) =>
    request<TableOverview>('GET', '/admin/stats/table-overview', { params: { from, to, limit } }),
  salesTrend: ({ from, to }: StatsRange) => request<TrendPoint[]>('GET', '/admin/stats/sales-trend', { params: { from, to } }),
  dishRanking: ({ from, to }: StatsRange, limit = 10) =>
    request<DishRankItem[]>('GET', '/admin/stats/dish-ranking', { params: { from, to, limit } }),
  /** 单日时段分布（Dashboard 今日时段） */
  hourly: (date: string) => request<HourlyPoint[]>('GET', '/admin/stats/hourly', { params: { date } }),
  /** 区间时段分布：一次请求替代逐日循环 */
  hourlyRange: ({ from, to }: StatsRange) => request<HourlyPoint[]>('GET', '/admin/stats/hourly', { params: { from, to } }),
  categoryShare: ({ from, to }: StatsRange) => request<CategoryShareItem[]>('GET', '/admin/stats/category-share', { params: { from, to } }),
}
