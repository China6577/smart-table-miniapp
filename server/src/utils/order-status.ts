/**
 * 订单状态机（与前端 admin/utils/status.ts 保持一致）：
 * PENDING → ACCEPTED → COOKING → READY → COMPLETED，取消仅限前三态。
 * 任何非法跳转由后端拒绝（设计文档 8.3 节）。
 */
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'COOKING' | 'READY' | 'COMPLETED' | 'CANCELLED'

export const ORDER_STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'COOKING', 'READY', 'COMPLETED', 'CANCELLED']

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['COOKING', 'CANCELLED'],
  COOKING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as string[]).includes(value)
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

/** 流转需要写入的时间戳字段名 */
export const TRANSITION_TIMESTAMP_FIELD: Partial<Record<OrderStatus, keyof OrderTimestamps>> = {
  ACCEPTED: 'acceptedAt',
  COOKING: 'cookingAt',
  READY: 'readyAt',
  COMPLETED: 'completedAt',
  CANCELLED: 'cancelledAt',
}

export interface OrderTimestamps {
  acceptedAt: Date | null
  cookingAt: Date | null
  readyAt: Date | null
  completedAt: Date | null
  cancelledAt: Date | null
}
