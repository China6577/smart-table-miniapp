import { appConfig } from '../config/index'
import { request } from './request'
import { delay } from '../utils/delay'
import { cartStore } from '../store/cart-store'
import type { CartItem, Order, OrderItem, OrderStatus } from '../types/model'

/**
 * 订单服务
 * Mock 模式下内置「时间驱动的状态机」：下单后按时间依次推进
 * 待接单 → 已接单 → 制作中 → 制作完成 → 已完成，模拟真实后端流转。
 * Phase 4 接入 WebSocket 后，状态由服务端实时推送，本层接口不变。
 */

const ORDERS_KEY = 'st_orders_v1'

/** Mock 状态机推进节奏（毫秒，相对下单时间） */
const MOCK_FLOW: Array<{ status: OrderStatus; after: number }> = [
  { status: 'PENDING', after: 0 },
  { status: 'ACCEPTED', after: 10_000 },
  { status: 'COOKING', after: 25_000 },
  { status: 'READY', after: 45_000 },
  { status: 'COMPLETED', after: 70_000 },
]

export interface SubmitOrderPayload {
  tableCode: string
  items: CartItem[]
  remark: string
  /** 下单幂等令牌，重复提交返回同一订单 */
  clientToken: string
}

function readOrders(): Order[] {
  try {
    const saved = wx.getStorageSync(ORDERS_KEY)
    if (Array.isArray(saved)) return saved as Order[]
  } catch (e) {
    // 读取异常按空处理
  }
  return []
}

function writeOrders(orders: Order[]) {
  try {
    wx.setStorageSync(ORDERS_KEY, orders)
  } catch (e) {
    // 写入失败不阻塞下单流程
  }
}

function toOrderItems(cartItems: CartItem[]): OrderItem[] {
  return cartItems.map((item) => ({
    key: item.key,
    dishId: item.dishId,
    name: item.name,
    image: item.image,
    specText: item.specText,
    unitPrice: item.unitPrice,
    quantity: item.count,
    subtotal: item.unitPrice * item.count,
  }))
}

/** 生成订单号：日期 + 当日 3 位流水（Mock 本地实现；真实环境由 Redis 序列生成） */
function generateOrderNo(): string {
  const now = new Date()
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const seqKey = `st_order_seq_${date}`
  let seq = Math.floor(Math.random() * 900) + 100
  try {
    seq = Number(wx.getStorageSync(seqKey) || 0) + 1
    wx.setStorageSync(seqKey, seq)
  } catch (e) {
    // 存储异常时退化为随机序列
  }
  return `${date}${String(seq).padStart(3, '0')}`
}

/** 按下单时间推导当前状态（返回带状态时间戳的副本，不回写存储） */
function applyMockStatus(order: Order): Order {
  const next: Order = { ...order }
  if (next.cancelledAt) {
    next.status = 'CANCELLED'
    return next
  }
  const age = Date.now() - next.createdAt
  for (const step of MOCK_FLOW) {
    if (age < step.after) break
    next.status = step.status
    const ts = next.createdAt + step.after
    if (step.status === 'ACCEPTED') next.acceptedAt = ts
    if (step.status === 'COOKING') next.cookingAt = ts
    if (step.status === 'READY') next.readyAt = ts
    if (step.status === 'COMPLETED') next.completedAt = ts
  }
  return next
}

/** 生成本地幂等令牌 */
export function generateClientToken(): string {
  return `c${Date.now()}${Math.floor(Math.random() * 100000)}`
}

export async function submitOrder(payload: SubmitOrderPayload): Promise<Order> {
  if (appConfig.useMock) {
    await delay(600)
    if (!payload.items.length) {
      throw new Error('购物车为空，无法下单')
    }
    const orders = readOrders()
    // 幂等：同一令牌重复提交返回首单
    const existed = orders.find((order) => order.clientToken === payload.clientToken)
    if (existed) return applyMockStatus(existed)

    const items = toOrderItems(payload.items)
    const order: Order = {
      orderNo: generateOrderNo(),
      tableCode: payload.tableCode,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
      remark: payload.remark,
      status: 'PENDING',
      createdAt: Date.now(),
      clientToken: payload.clientToken,
    }
    orders.unshift(order)
    writeOrders(orders)
    return { ...order }
  }
  return request<Order>({ url: '/customer/orders', method: 'POST', data: payload })
}

/** 本机历史订单（按下单时间倒序）；真实模式下限定当前桌号 */
export async function getMyOrders(): Promise<Order[]> {
  if (appConfig.useMock) {
    await delay(150)
    return readOrders()
      .map(applyMockStatus)
      .sort((a, b) => b.createdAt - a.createdAt)
  }
  const { tableCode } = cartStore.getState()
  return request<Order[]>({ url: '/customer/orders', data: { tableCode } })
}

export async function getOrderDetail(orderNo: string): Promise<Order> {
  if (appConfig.useMock) {
    await delay(120)
    const order = readOrders().find((item) => item.orderNo === orderNo)
    if (!order) throw new Error('订单不存在')
    return applyMockStatus(order)
  }
  return request<Order>({ url: `/customer/orders/${orderNo}` })
}

/** 顾客自助取消：仅「待接单」状态允许 */
export async function cancelOrder(orderNo: string): Promise<Order> {
  if (appConfig.useMock) {
    await delay(300)
    const orders = readOrders()
    const index = orders.findIndex((item) => item.orderNo === orderNo)
    if (index < 0) throw new Error('订单不存在')
    const current = applyMockStatus(orders[index])
    if (current.status !== 'PENDING') {
      throw new Error('订单已接单，请联系服务员取消')
    }
    orders[index] = {
      ...orders[index],
      cancelledAt: Date.now(),
      cancelReason: '顾客自助取消',
    }
    writeOrders(orders)
    return applyMockStatus(orders[index])
  }
  return request<Order>({ url: `/customer/orders/${orderNo}/cancel`, method: 'POST' })
}
