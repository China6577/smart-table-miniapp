import type { Order, OrderStatus } from '../types/model'
import { formatTime } from './format'

/** 订单状态展示元信息 */
export interface StatusMeta {
  text: string
  desc: string
  tone: 'active' | 'done' | 'cancel'
}

const STATUS_META: Record<OrderStatus, StatusMeta> = {
  PENDING: { text: '待接单', desc: '订单已提交，等待商家确认', tone: 'active' },
  ACCEPTED: { text: '已接单', desc: '商家已接单，即将开始制作', tone: 'active' },
  COOKING: { text: '制作中', desc: '厨房正在加紧制作，请稍候', tone: 'active' },
  READY: { text: '制作完成', desc: '菜品已出餐，请慢慢享用', tone: 'active' },
  COMPLETED: { text: '已完成', desc: '感谢惠顾，欢迎再次光临', tone: 'done' },
  CANCELLED: { text: '已取消', desc: '订单已取消', tone: 'cancel' },
}

export function getStatusMeta(status: OrderStatus): StatusMeta {
  return STATUS_META[status]
}

/** 订单状态徽标样式类名（order-list 页使用） */
export function getStatusClass(status: OrderStatus): string {
  if (status === 'CANCELLED') return 'cancel'
  if (status === 'COMPLETED') return 'done'
  if (status === 'PENDING') return 'pending'
  return 'doing'
}

/** 状态时间线节点 */
export interface TimelineNode {
  key: string
  label: string
  time: string
  state: 'done' | 'current' | 'todo'
}

const ORDER_FLOW: Array<{ key: keyof Order; label: string }> = [
  { key: 'createdAt', label: '提交订单' },
  { key: 'acceptedAt', label: '商家接单' },
  { key: 'cookingAt', label: '开始制作' },
  { key: 'readyAt', label: '制作完成' },
  { key: 'completedAt', label: '订单完成' },
]

/** 构建订单状态时间线（取消的订单只标记已完成节点） */
export function buildTimeline(order: Order): TimelineNode[] {
  const cancelled = order.status === 'CANCELLED'
  let currentIndex = -1
  if (!cancelled) {
    currentIndex = ORDER_FLOW.reduce((acc, step, index) => {
      return order[step.key] !== undefined ? index : acc
    }, -1)
  }
  return ORDER_FLOW.map((step, index) => {
    const ts = order[step.key] as number | undefined
    const state: TimelineNode['state'] = cancelled
      ? index === 0 ? 'done' : 'todo'
      : index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo'
    return {
      key: step.key as string,
      label: step.label,
      time: ts !== undefined ? formatTime(ts) : '',
      state,
    }
  })
}
