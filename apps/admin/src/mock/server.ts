/**
 * Mock 服务端：按设计文档 6.3 节接口契约实现（路径、参数、响应一致）。
 * Phase 3 将 request.ts 切到 http 模式后，本文件整体退役，业务代码零改动。
 *
 * 特性：
 * - 模拟网络延迟
 * - Token 鉴权 + RBAC（admin/manager/waiter/kitchen）
 * - 订单状态机校验（非法流转拒绝）
 * - 统计口径：营业额 = 有效订单（不含已取消）实付金额
 */
import { appConfig } from '@/config'
import type {
  AuthUser,
  Category,
  DiningTable,
  Dish,
  Order,
  OrderStatus,
  Staff,
  StaffRole,
} from '@/types/model'
import type {
  CategoryShareItem,
  DashboardSummary,
  DishRankItem,
  HourlyPoint,
  LoginResult,
  OverviewStats,
  TableOverview,
  TrendPoint,
} from '@/types/api'
import { getDb, saveDb, type MockDb } from './db'
import { canTransition } from '@/utils/status'
import { genOrderNo, itemKey } from '@/utils/id'
import { dateStrToTs, startOfDay } from '@/utils/format'

interface TokenPayload {
  uid: string
  username: string
  role: StaffRole
  exp: number
}

export interface MockHttpError {
  code: number
  message: string
}

function err(code: number, message: string): MockHttpError {
  return { code, message }
}

function isHttpError(e: unknown): e is MockHttpError {
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 演示账号统一密码（真实环境：bcrypt 哈希 + JWT，见设计文档） */
const DEMO_PASSWORD = '123456'

function issueToken(staff: Staff): string {
  const payload: TokenPayload = {
    uid: staff.id,
    username: staff.username,
    role: staff.role,
    exp: Date.now() + 12 * 3_600_000,
  }
  return btoa(JSON.stringify(payload))
}

function authStaff(token?: string): Staff {
  if (!token) throw err(401, '未登录或登录已过期')
  let payload: TokenPayload
  try {
    payload = JSON.parse(atob(token)) as TokenPayload
  } catch {
    throw err(401, '登录已过期')
  }
  if (payload.exp < Date.now()) throw err(401, '登录已过期')
  const staff = getDb().staff.find((s) => s.id === payload.uid)
  if (!staff || staff.status !== 1) throw err(401, '账号不存在或已禁用')
  return staff
}

function requireRole(staff: Staff, roles: StaffRole[]): void {
  if (!roles.includes(staff.role)) throw err(403, '没有该操作的权限')
}

function toAuthUser(staff: Staff): AuthUser {
  return { id: staff.id, username: staff.username, name: staff.name, role: staff.role }
}

/** 有效订单（营业额统计口径）：不含已取消 */
function isValid(o: Order): boolean {
  return o.status !== 'CANCELLED'
}

function inRange(o: Order, fromTs: number, toTs: number): boolean {
  return o.createdAt >= fromTs && o.createdAt < toTs
}

function applyTransition(order: Order, to: OrderStatus, reason?: string): void {
  const now = Date.now()
  switch (to) {
    case 'ACCEPTED':
      order.acceptedAt = now
      break
    case 'COOKING':
      order.cookingAt = now
      break
    case 'READY':
      order.readyAt = now
      break
    case 'COMPLETED':
      order.completedAt = now
      break
    case 'CANCELLED':
      order.cancelledAt = now
      if (reason) order.cancelReason = reason
      break
  }
  order.status = to
}

function findOrder(db: MockDb, orderNo: string): Order {
  const order = db.orders.find((o) => o.orderNo === orderNo)
  if (!order) throw err(404, '订单不存在')
  return order
}

/** 订单流转公共逻辑 */
function transitionOrder(orderNo: string, to: OrderStatus, reason?: string): Order {
  return saveDb((db) => {
    const order = findOrder(db, orderNo)
    if (!canTransition(order.status, to)) {
      throw err(422, `当前状态「${order.status}」不允许流转到「${to}」`)
    }
    applyTransition(order, to, reason)
  }).orders.find((o) => o.orderNo === orderNo)!
}

// ---------------- 统计计算 ----------------

function aggregateByDay(orders: Order[], fromTs: number, toTs: number): TrendPoint[] {
  const points: TrendPoint[] = []
  for (let ts = startOfDay(fromTs); ts < toTs; ts += 86_400_000) {
    const dayOrders = orders.filter((o) => inRange(o, ts, ts + 86_400_000) && isValid(o))
    points.push({
      date: new Date(ts).toISOString().slice(0, 10),
      revenue: round(dayOrders.reduce((sum, o) => sum + o.totalAmount, 0)),
      orderCount: dayOrders.length,
    })
  }
  return points
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function aggregateDishRanking(orders: Order[], fromTs: number, toTs: number, limit: number): DishRankItem[] {
  const map = new Map<string, DishRankItem>()
  for (const order of orders) {
    if (!inRange(order, fromTs, toTs) || !isValid(order)) continue
    for (const item of order.items) {
      const entry = map.get(item.dishId) ?? { dishId: item.dishId, name: item.name, quantity: 0, revenue: 0 }
      entry.quantity += item.quantity
      entry.revenue = round(entry.revenue + item.subtotal)
      map.set(item.dishId, entry)
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, limit)
}

// ---------------- 主路由 ----------------

export async function mockHandle<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown,
  token?: string,
): Promise<T> {
  await delay(appConfig.mockLatency)
  const [rawPath, rawQuery] = path.split('?')
  const seg = rawPath.split('/').filter(Boolean) // ['admin', 'orders', ...]
  const query = new URLSearchParams(rawQuery ?? '')
  const body = (data ?? {}) as Record<string, unknown>
  const db = getDb()

  // ---------- 登录（公开） ----------
  if (method === 'POST' && rawPath === '/admin/auth/login') {
    const username = String(body.username ?? '')
    const password = String(body.password ?? '')
    const staff = db.staff.find((s) => s.username === username)
    if (!staff || password !== DEMO_PASSWORD) throw err(422, '用户名或密码错误')
    if (staff.status !== 1) throw err(422, '账号已被禁用')
    const result: LoginResult = { token: issueToken(staff), user: toAuthUser(staff) }
    return result as T
  }

  const staff = authStaff(token)

  if (method === 'GET' && rawPath === '/admin/auth/me') {
    return toAuthUser(staff) as T
  }

  // ---------- 仪表盘 ----------
  if (method === 'GET' && rawPath === '/admin/dashboard/summary') {
    const todayStart = startOfDay()
    const todayOrders = db.orders.filter((o) => o.createdAt >= todayStart)
    const validToday = todayOrders.filter(isValid)
    const revenue = validToday.reduce((sum, o) => sum + o.totalAmount, 0)
    const yesterdayStart = todayStart - 86_400_000
    const yesterdayRevenue = db.orders
      .filter((o) => isValid(o) && inRange(o, yesterdayStart, todayStart))
      .reduce((sum, o) => sum + o.totalAmount, 0)
    const topDishes = aggregateDishRanking(db.orders, todayStart, todayStart + 86_400_000, 5)
    const summary: DashboardSummary = {
      todayRevenue: round(revenue),
      yesterdayRevenue: round(yesterdayRevenue),
      todayOrderCount: validToday.length,
      todayAvgAmount: validToday.length > 0 ? round(revenue / validToday.length) : 0,
      pendingCount: todayOrders.filter((o) => o.status === 'PENDING').length,
      cookingCount: todayOrders.filter((o) => o.status === 'COOKING').length,
      topDishes,
    }
    return summary as T
  }

  // ---------- 订单 ----------
  if (method === 'GET' && rawPath === '/admin/orders') {
    const status = query.get('status') ?? ''
    const date = query.get('date') ?? ''
    const keyword = (query.get('keyword') ?? '').trim()
    const page = Number(query.get('page') ?? 1)
    const pageSize = Number(query.get('pageSize') ?? 10)
    let list = [...db.orders].sort((a, b) => b.createdAt - a.createdAt)
    if (status) list = list.filter((o) => o.status === status)
    if (date) {
      const from = dateStrToTs(date)
      list = list.filter((o) => inRange(o, from, from + 86_400_000))
    }
    if (keyword) {
      list = list.filter((o) => o.orderNo.includes(keyword) || o.tableCode.toLowerCase().includes(keyword.toLowerCase()))
    }
    const total = list.length
    const start = (page - 1) * pageSize
    return { list: list.slice(start, start + pageSize), total, page, pageSize } as T
  }

  if (method === 'GET' && seg[0] === 'admin' && seg[1] === 'orders' && seg.length === 3) {
    return findOrder(db, seg[2]) as T
  }

  if (method === 'POST' && seg[0] === 'admin' && seg[1] === 'orders' && seg[3] === 'accept' && seg.length === 4) {
    return transitionOrder(seg[2], 'ACCEPTED') as T
  }

  if (method === 'POST' && seg[0] === 'admin' && seg[1] === 'orders' && seg[3] === 'status' && seg.length === 4) {
    const to = String(body.to ?? '') as OrderStatus
    if (!['ACCEPTED', 'COOKING', 'READY', 'COMPLETED', 'CANCELLED'].includes(to)) {
      throw err(422, '非法的目标状态')
    }
    return transitionOrder(seg[2], to, body.reason ? String(body.reason) : undefined) as T
  }

  if (method === 'POST' && seg[0] === 'admin' && seg[1] === 'orders' && seg[3] === 'cancel' && seg.length === 4) {
    const reason = String(body.reason ?? '')
    if (!reason) throw err(422, '取消订单必须填写原因')
    return transitionOrder(seg[2], 'CANCELLED', reason) as T
  }

  // KDS 便捷动作：待制作 → 直接开始制作（PENDING 自动先接单）
  if (method === 'POST' && seg[0] === 'admin' && seg[1] === 'orders' && seg[3] === 'start' && seg.length === 4) {
    const orderNo = seg[2]
    return saveDb((current) => {
      const order = findOrder(current, orderNo)
      if (order.status === 'PENDING') {
        applyTransition(order, 'ACCEPTED')
        applyTransition(order, 'COOKING')
      } else if (order.status === 'ACCEPTED') {
        applyTransition(order, 'COOKING')
      } else {
        throw err(422, '当前状态不允许开始制作')
      }
    }).orders.find((o) => o.orderNo === orderNo)! as T
  }

  if (method === 'POST' && seg[0] === 'admin' && seg[1] === 'orders' && seg[3] === 'finish' && seg.length === 4) {
    return transitionOrder(seg[2], 'READY') as T
  }

  if (method === 'POST' && seg[0] === 'admin' && seg[1] === 'orders' && seg[3] === 'serve' && seg.length === 4) {
    return transitionOrder(seg[2], 'COMPLETED') as T
  }

  // ---------- 菜品 ----------
  if (method === 'GET' && rawPath === '/admin/dishes') {
    requireRole(staff, ['admin', 'manager'])
    const keyword = (query.get('keyword') ?? '').trim()
    const categoryId = query.get('categoryId') ?? ''
    const status = query.get('status') ?? ''
    let list = [...db.dishes]
    if (keyword) list = list.filter((d) => d.name.includes(keyword))
    if (categoryId) list = list.filter((d) => d.categoryId === categoryId)
    if (status) list = list.filter((d) => d.status === status)
    return list.sort((a, b) => a.sort - b.sort) as T
  }

  if (method === 'POST' && rawPath === '/admin/dishes') {
    requireRole(staff, ['admin', 'manager'])
    const name = String(body.name ?? '').trim()
    const price = Number(body.price ?? 0)
    const categoryId = String(body.categoryId ?? '')
    if (!name) throw err(422, '菜品名称不能为空')
    if (!(price > 0)) throw err(422, '价格必须大于 0')
    if (!db.categories.find((c) => c.id === categoryId)) throw err(422, '请选择有效分类')
    const created: Dish = {
      id: `d${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
      name,
      image: String(body.image ?? '') || defaultDishImage(name),
      price,
      categoryId,
      description: String(body.description ?? ''),
      sales: 0,
      rating: 4.5,
      status: body.status === 'off' || body.status === 'soldout' ? (body.status as Dish['status']) : 'on',
      isHot: Boolean(body.isHot),
      isSignature: Boolean(body.isSignature),
      sort: db.dishes.length + 1,
    }
    saveDb((current) => current.dishes.push(created))
    return created as T
  }

  if (method === 'PUT' && seg[0] === 'admin' && seg[1] === 'dishes' && seg.length === 3) {
    requireRole(staff, ['admin', 'manager'])
    const dishId = seg[2]
    return saveDb((current) => {
      const dish = current.dishes.find((d) => d.id === dishId)
      if (!dish) throw err(404, '菜品不存在')
      if (body.name !== undefined) dish.name = String(body.name)
      if (body.price !== undefined) {
        const price = Number(body.price)
        if (!(price > 0)) throw err(422, '价格必须大于 0')
        dish.price = price
      }
      if (body.categoryId !== undefined) {
        if (!current.categories.find((c) => c.id === String(body.categoryId))) throw err(422, '分类不存在')
        dish.categoryId = String(body.categoryId)
      }
      if (body.description !== undefined) dish.description = String(body.description)
      if (body.image !== undefined && String(body.image)) dish.image = String(body.image)
      if (body.status !== undefined) dish.status = body.status as Dish['status']
      if (body.isHot !== undefined) dish.isHot = Boolean(body.isHot)
      if (body.isSignature !== undefined) dish.isSignature = Boolean(body.isSignature)
      if (body.sort !== undefined) dish.sort = Number(body.sort)
    }).dishes.find((d) => d.id === dishId)! as T
  }

  // 整组替换菜品规格（与后端契约一致：提交即全量覆盖）
  if (method === 'PUT' && seg[0] === 'admin' && seg[1] === 'dishes' && seg.length === 4 && seg[3] === 'specs') {
    requireRole(staff, ['admin', 'manager'])
    const dishId = seg[2]
    return saveDb((current) => {
      const dish = current.dishes.find((d) => d.id === dishId)
      if (!dish) throw err(404, '菜品不存在')
      const input = Array.isArray(body.specs) ? body.specs : []
      const stamp = Date.now().toString(36)
      dish.specs = input.map((g: { name?: string; options?: Array<{ label?: string; priceDelta?: number }> }, gi: number) => ({
        id: `${dishId}-spec-${gi}-${stamp}`,
        name: String(g.name ?? '').trim(),
        options: (g.options ?? []).map((o, oi) => ({
          id: `${dishId}-opt-${gi}-${oi}-${stamp}`,
          label: String(o.label ?? '').trim(),
          priceDelta: Number(o.priceDelta ?? 0),
        })),
      }))
    }).dishes.find((d) => d.id === dishId)! as T
  }

  if (method === 'DELETE' && seg[0] === 'admin' && seg[1] === 'dishes' && seg.length === 3) {
    requireRole(staff, ['admin', 'manager'])
    saveDb((current) => {
      current.dishes = current.dishes.filter((d) => d.id !== seg[2])
    })
    return true as T
  }

  // ---------- 分类 ----------
  if (method === 'GET' && rawPath === '/admin/categories') {
    requireRole(staff, ['admin', 'manager'])
    return [...db.categories].sort((a, b) => a.sort - b.sort) as T
  }

  if (method === 'POST' && rawPath === '/admin/categories') {
    requireRole(staff, ['admin', 'manager'])
    const name = String(body.name ?? '').trim()
    if (!name) throw err(422, '分类名称不能为空')
    if (db.categories.find((c) => c.name === name)) throw err(422, '分类已存在')
    const created: Category = {
      id: `c${Date.now().toString(36)}`,
      name,
      sort: Number(body.sort ?? db.categories.length + 1),
      status: body.status === 0 ? 0 : 1,
    }
    saveDb((current) => current.categories.push(created))
    return created as T
  }

  if (method === 'PUT' && seg[0] === 'admin' && seg[1] === 'categories' && seg.length === 3) {
    requireRole(staff, ['admin', 'manager'])
    const catId = seg[2]
    return saveDb((current) => {
      const cat = current.categories.find((c) => c.id === catId)
      if (!cat) throw err(404, '分类不存在')
      if (body.name !== undefined) {
        const name = String(body.name).trim()
        if (!name) throw err(422, '分类名称不能为空')
        if (current.categories.find((c) => c.name === name && c.id !== catId)) throw err(422, '分类名称已存在')
        cat.name = name
      }
      if (body.sort !== undefined) cat.sort = Number(body.sort)
      if (body.status !== undefined) cat.status = body.status === 0 ? 0 : 1
    }).categories.find((c) => c.id === catId)! as T
  }

  if (method === 'DELETE' && seg[0] === 'admin' && seg[1] === 'categories' && seg.length === 3) {
    requireRole(staff, ['admin', 'manager'])
    const catId = seg[2]
    if (db.dishes.some((d) => d.categoryId === catId)) throw err(422, '该分类下仍有菜品，请先移除或转移菜品')
    saveDb((current) => {
      current.categories = current.categories.filter((c) => c.id !== catId)
    })
    return true as T
  }

  // ---------- 桌号 ----------
  if (method === 'GET' && rawPath === '/admin/tables') {
    requireRole(staff, ['admin', 'manager'])
    return [...db.tables].sort((a, b) => a.code.localeCompare(b.code)) as T
  }

  if (method === 'POST' && rawPath === '/admin/tables') {
    requireRole(staff, ['admin', 'manager'])
    const code = String(body.code ?? '').trim().toUpperCase()
    const capacity = Number(body.capacity ?? 4)
    if (!/^[A-Z]\d{1,2}$/.test(code)) throw err(422, '桌号格式应为字母+数字，如 A01')
    if (db.tables.find((t) => t.code === code)) throw err(422, '桌号已存在')
    if (!(capacity >= 1 && capacity <= 30)) throw err(422, '可坐人数应在 1-30 之间')
    const created: DiningTable = {
      id: `t${Date.now().toString(36)}`,
      code,
      area: String(body.area ?? '大厅'),
      capacity,
      status: body.status === 0 ? 0 : 1,
    }
    saveDb((current) => current.tables.push(created))
    return created as T
  }

  if (method === 'PUT' && seg[0] === 'admin' && seg[1] === 'tables' && seg.length === 3) {
    requireRole(staff, ['admin', 'manager'])
    const tableId = seg[2]
    return saveDb((current) => {
      const table = current.tables.find((t) => t.id === tableId)
      if (!table) throw err(404, '餐桌不存在')
      if (body.code !== undefined) {
        const code = String(body.code).trim().toUpperCase()
        if (!/^[A-Z]\d{1,2}$/.test(code)) throw err(422, '桌号格式应为字母+数字，如 A01')
        if (current.tables.find((t) => t.code === code && t.id !== tableId)) throw err(422, '桌号已存在')
        table.code = code
      }
      if (body.area !== undefined) table.area = String(body.area)
      if (body.capacity !== undefined) {
        const capacity = Number(body.capacity)
        if (!(capacity >= 1 && capacity <= 30)) throw err(422, '可坐人数应在 1-30 之间')
        table.capacity = capacity
      }
      if (body.status !== undefined) table.status = body.status === 0 ? 0 : 1
    }).tables.find((t) => t.id === tableId)! as T
  }

  if (method === 'DELETE' && seg[0] === 'admin' && seg[1] === 'tables' && seg.length === 3) {
    requireRole(staff, ['admin', 'manager'])
    saveDb((current) => {
      current.tables = current.tables.filter((t) => t.id !== seg[2])
    })
    return true as T
  }

  // ---------- 员工 ----------
  if (method === 'GET' && rawPath === '/admin/staff') {
    requireRole(staff, ['admin'])
    return [...db.staff].sort((a, b) => a.createdAt - b.createdAt) as T
  }

  if (method === 'POST' && rawPath === '/admin/staff') {
    requireRole(staff, ['admin'])
    const username = String(body.username ?? '').trim()
    const name = String(body.name ?? '').trim()
    const role = String(body.role ?? '') as StaffRole
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw err(422, '用户名需为 3-20 位字母/数字/下划线')
    if (!name) throw err(422, '姓名不能为空')
    if (!['admin', 'manager', 'waiter', 'kitchen'].includes(role)) throw err(422, '角色不合法')
    if (db.staff.find((s) => s.username === username)) throw err(422, '用户名已存在')
    const created: Staff = {
      id: `s${Date.now().toString(36)}`,
      username,
      name,
      role,
      status: body.status === 0 ? 0 : 1,
      createdAt: Date.now(),
    }
    saveDb((current) => current.staff.push(created))
    return created as T
  }

  if (method === 'PUT' && seg[0] === 'admin' && seg[1] === 'staff' && seg.length === 3) {
    requireRole(staff, ['admin'])
    const staffId = seg[2]
    return saveDb((current) => {
      const target = current.staff.find((s) => s.id === staffId)
      if (!target) throw err(404, '员工不存在')
      if (body.name !== undefined) {
        const name = String(body.name).trim()
        if (!name) throw err(422, '姓名不能为空')
        target.name = name
      }
      if (body.role !== undefined) {
        const role = String(body.role) as StaffRole
        if (!['admin', 'manager', 'waiter', 'kitchen'].includes(role)) throw err(422, '角色不合法')
        if (target.id === staff.id && role !== 'admin') throw err(422, '不能降级自己的店长角色')
        target.role = role
      }
      if (body.status !== undefined) {
        if (target.id === staff.id && body.status === 0) throw err(422, '不能禁用自己的账号')
        target.status = body.status === 0 ? 0 : 1
      }
    }).staff.find((s) => s.id === staffId)! as T
  }

  if (method === 'DELETE' && seg[0] === 'admin' && seg[1] === 'staff' && seg.length === 3) {
    requireRole(staff, ['admin'])
    if (seg[2] === staff.id) throw err(422, '不能删除自己的账号')
    saveDb((current) => {
      current.staff = current.staff.filter((s) => s.id !== seg[2])
    })
    return true as T
  }

  // ---------- 统计 ----------

  if (method === 'GET' && rawPath === '/admin/stats/overview') {
    requireRole(staff, ['admin', 'manager'])
    const from = dateStrToTs(query.get('from') ?? '')
    const to = dateStrToTs(query.get('to') ?? '') + 86_400_000
    if (!(to > from)) throw err(422, '日期范围不合法')
    const span = to - from
    const current = db.orders.filter((o) => inRange(o, from, to) && isValid(o))
    const previous = db.orders.filter((o) => inRange(o, from - span, from) && isValid(o))
    const cancelled = db.orders.filter((o) => inRange(o, from, to) && !isValid(o))
    const revenue = current.reduce((sum, o) => sum + o.totalAmount, 0)
    const prevRevenue = previous.reduce((sum, o) => sum + o.totalAmount, 0)
    const total = current.length + cancelled.length
    const result: OverviewStats = {
      days: Math.max(1, Math.round(span / 86_400_000)),
      revenue: round(revenue),
      orderCount: current.length,
      avgAmount: current.length > 0 ? round(revenue / current.length) : 0,
      cancelCount: cancelled.length,
      cancelRate: total > 0 ? round((cancelled.length / total) * 100) : 0,
      prevRevenue: round(prevRevenue),
      prevOrderCount: previous.length,
      revenueGrowth: prevRevenue > 0 ? round(((revenue - prevRevenue) / prevRevenue) * 100) : null,
      orderGrowth: previous.length > 0 ? round(((current.length - previous.length) / previous.length) * 100) : null,
    }
    return result as T
  }

  if (method === 'GET' && rawPath === '/admin/stats/table-overview') {
    requireRole(staff, ['admin', 'manager'])
    const from = dateStrToTs(query.get('from') ?? '')
    const to = dateStrToTs(query.get('to') ?? '') + 86_400_000
    if (!(to > from)) throw err(422, '日期范围不合法')
    const limit = Number(query.get('limit') ?? 10)
    const activeTables = db.tables.filter((t) => t.status === 1)
    const areaByCode = new Map(activeTables.map((t) => [t.code, t.area]))
    const orders = db.orders.filter((o) => inRange(o, from, to) && isValid(o))
    const statByTable = new Map<string, { tableCode: string; area: string; orderCount: number; revenue: number }>()
    for (const order of orders) {
      const entry = statByTable.get(order.tableCode) ?? { tableCode: order.tableCode, area: areaByCode.get(order.tableCode) ?? '未知区域', orderCount: 0, revenue: 0 }
      entry.orderCount += 1
      entry.revenue = round(entry.revenue + order.totalAmount)
      statByTable.set(order.tableCode, entry)
    }
    const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    const used = statByTable.size
    const result: TableOverview = {
      totalTables: activeTables.length,
      usedTables: used,
      usageRate: activeTables.length > 0 ? round((used / activeTables.length) * 100) : 0,
      orderCount: orders.length,
      revenue: round(revenue),
      avgTableAmount: used > 0 ? round(revenue / used) : 0,
      turnoverRate: used > 0 ? round(orders.length / used) : 0,
      topTables: [...statByTable.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit),
    }
    return result as T
  }

  if (method === 'GET' && rawPath === '/admin/stats/sales-trend') {
    requireRole(staff, ['admin', 'manager'])
    const from = dateStrToTs(query.get('from') ?? '')
    const to = dateStrToTs(query.get('to') ?? '') + 86_400_000
    if (!(to > from)) throw err(422, '日期范围不合法')
    return aggregateByDay(db.orders, from, to) as T
  }

  if (method === 'GET' && rawPath === '/admin/stats/dish-ranking') {
    requireRole(staff, ['admin', 'manager'])
    const from = dateStrToTs(query.get('from') ?? '')
    const to = dateStrToTs(query.get('to') ?? '') + 86_400_000
    const limit = Number(query.get('limit') ?? 10)
    return aggregateDishRanking(db.orders, from, to, limit) as T
  }

  if (method === 'GET' && rawPath === '/admin/stats/hourly') {
    requireRole(staff, ['admin', 'manager'])
    // date 单日（旧契约）或 from+to 区间（区间内日均）二选一
    let from: number
    let to: number
    let days: number
    if (query.get('from') && query.get('to')) {
      from = dateStrToTs(query.get('from')!)
      to = dateStrToTs(query.get('to')!) + 86_400_000
      if (!(to > from)) throw err(422, '日期范围不合法')
      days = Math.max(1, Math.round((to - from) / 86_400_000))
    } else if (query.get('date')) {
      from = dateStrToTs(query.get('date')!)
      to = from + 86_400_000
      days = 1
    } else {
      throw err(422, '需提供 date 或 from+to 查询参数')
    }
    const points: HourlyPoint[] = []
    for (let hour = 0; hour < 24; hour++) {
      points.push({ hour, orderCount: 0, revenue: 0 })
    }
    for (const order of db.orders) {
      if (!inRange(order, from, to) || !isValid(order)) continue
      const hour = new Date(order.createdAt).getHours()
      points[hour].orderCount += 1
      points[hour].revenue = round(points[hour].revenue + order.totalAmount)
    }
    return points.map((p) => ({ hour: p.hour, orderCount: Math.round(p.orderCount / days), revenue: round(p.revenue / days) })) as T
  }

  if (method === 'GET' && rawPath === '/admin/stats/category-share') {
    requireRole(staff, ['admin', 'manager'])
    const from = dateStrToTs(query.get('from') ?? '')
    const to = dateStrToTs(query.get('to') ?? '') + 86_400_000
    const map = new Map<string, CategoryShareItem>()
    for (const order of db.orders) {
      if (!inRange(order, from, to) || !isValid(order)) continue
      for (const item of order.items) {
        const dish = db.dishes.find((d) => d.id === item.dishId)
        const cat = dish?.categoryId ?? 'other'
        const entry = map.get(cat) ?? { categoryId: cat, name: db.categories.find((c) => c.id === cat)?.name ?? '其他', revenue: 0 }
        entry.revenue = round(entry.revenue + item.subtotal)
        map.set(cat, entry)
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue) as T
  }

  throw err(404, `接口不存在：${method} ${rawPath}`)
}

/** 新增菜品缺省图：按名称生成真实食物摄影图 */
function defaultDishImage(name: string): string {
  const prompt = `${name}, authentic Chinese dish, ${'realistic food photography, served on a plain white ceramic plate on a light wooden restaurant table, warm natural lighting, 45-degree angle, appetizing, high detail, authentic Chinese restaurant menu photo style, no people, no text, no cartoon, not an illustration'}`
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square`
}

// ---------------- 模拟顾客下单（供 simulator 调用） ----------------

const SIM_REMARKS = ['不要辣', '少油少盐', '赶时间，麻烦快一点', '有小孩，口味清淡', '多加饭', '餐具多备一套']

/** 模拟一位顾客扫码下单：随机桌号 + 加权菜品，进入 PENDING 待接单 */
export function createSimulatedOrder(): Order {
  const db = getDb()
  const candidates = db.dishes.filter((d) => d.status === 'on')
  const table = db.tables[Math.floor(Math.random() * db.tables.length)]
  const count = 2 + Math.floor(Math.random() * 4)
  const items = new Map<string, Order['items'][number]>()
  for (let i = 0; i < count; i++) {
    const dish = candidates[Math.floor(Math.random() * candidates.length)]
    if (!dish) continue
    const quantity = dish.categoryId === 'staple' ? 1 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2)
    const specText = Math.random() < 0.2 ? (dish.categoryId === 'staple' ? (Math.random() < 0.5 ? '小碗' : '大碗') : Math.random() < 0.5 ? '微辣' : '中辣') : undefined
    const unitPrice = specText === '大碗' ? dish.price + (dish.price > 10 ? 12 : 1) : dish.price
    const key = itemKey(dish.id, specText)
    const existing = items.get(key)
    if (existing) {
      existing.quantity += quantity
      existing.subtotal = existing.unitPrice * existing.quantity
    } else {
      items.set(key, {
        key,
        dishId: dish.id,
        name: dish.name,
        image: dish.image,
        specText,
        unitPrice,
        quantity,
        subtotal: unitPrice * quantity,
      })
    }
  }
  const itemList = [...items.values()]
  const order: Order = {
    orderNo: genOrderNo(),
    tableCode: table?.code ?? 'A01',
    items: itemList,
    itemCount: itemList.reduce((sum, it) => sum + it.quantity, 0),
    totalAmount: round(itemList.reduce((sum, it) => sum + it.subtotal, 0)),
    remark: Math.random() < 0.25 ? SIM_REMARKS[Math.floor(Math.random() * SIM_REMARKS.length)] : '',
    status: 'PENDING',
    createdAt: Date.now(),
  }
  return saveDb((current) => current.orders.unshift(order)).orders[0]
}

export { isHttpError }
