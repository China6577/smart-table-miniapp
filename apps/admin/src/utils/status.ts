/**
 * 订单状态元信息与状态机（与顾客小程序、后端保持一致）
 * 流转规则见 docs/01-系统设计.md 8.3 节。
 */
import type { Order, OrderStatus } from '@/types/model'

/** 状态展示元信息 */
export interface StatusMeta {
  text: string
  /** 徽标配色方案 */
  tone: 'pending' | 'doing' | 'ready' | 'done' | 'cancel'
  /** 给顾客看的状态描述 */
  desc: string
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  PENDING: { text: '待接单', tone: 'pending', desc: '订单已提交，等待商家确认' },
  ACCEPTED: { text: '已接单', tone: 'doing', desc: '商家已接单，即将开始制作' },
  COOKING: { text: '制作中', tone: 'doing', desc: '厨房正在加紧制作' },
  READY: { text: '制作完成', tone: 'ready', desc: '菜品已出餐' },
  COMPLETED: { text: '已完成', tone: 'done', desc: '订单已完成' },
  CANCELLED: { text: '已取消', tone: 'cancel', desc: '订单已取消' },
}

/** Tailwind 徽标样式 */
export const STATUS_BADGE_CLASS: Record<StatusMeta['tone'], string> = {
  pending: 'bg-amber-100 text-amber-700 ring-amber-200',
  doing: 'bg-sky-100 text-sky-700 ring-sky-200',
  ready: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  done: 'bg-slate-100 text-slate-600 ring-slate-200',
  cancel: 'bg-red-100 text-red-600 ring-red-200',
}

/** 状态机的合法流转表 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['COOKING', 'CANCELLED'],
  COOKING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

/** 校验状态流转是否合法 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

/** 流转成功后需要写入的时间戳字段（订单审计轨迹） */
const TIMESTAMPS: Partial<Record<OrderStatus, keyof Order>> = {
  ACCEPTED: 'acceptedAt',
  COOKING: 'cookingAt',
  READY: 'readyAt',
  COMPLETED: 'completedAt',
  CANCELLED: 'cancelledAt',
}

export function transitionTimestampField(status: OrderStatus): keyof Order | undefined {
  return TIMESTAMPS[status]
}

/** KDS 泳道分组：待制作（未开始做）/ 制作中 / 出餐完成 */
export type KdsLane = 'todo' | 'cooking' | 'done'

export function kdsLaneOf(status: OrderStatus): KdsLane {
  if (status === 'PENDING' || status === 'ACCEPTED') return 'todo'
  if (status === 'COOKING') return 'cooking'
  return 'done'
}

/** 员工角色元信息 */
export const ROLE_META: Record<string, { text: string; desc: string }> = {
  admin: { text: '店长', desc: '拥有全部权限' },
  manager: { text: '经理', desc: '订单、菜品、数据，不含员工管理' },
  waiter: { text: '服务员', desc: '订单与看板' },
  kitchen: { text: '厨房', desc: '仅 KDS 大屏' },
}
