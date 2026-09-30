/**
 * 订单号生成：日期 + 4 位当日序号（如 202608260001）。
 * Mock 用内存计数器；Phase 3 后端改用 Redis 自增序列保证全局唯一。
 */
let dailySeq = 0
let dailySeqDate = ''

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

export function genOrderNo(): string {
  const date = todayStr()
  if (dailySeqDate !== date) {
    dailySeqDate = date
    dailySeq = 0
  }
  dailySeq += 1
  return `${date}${String(dailySeq).padStart(4, '0')}`
}

/** 依据已有订单同步当日序号，防止种子数据与新增订单撞号 */
export function syncOrderNoSeq(orders: Array<{ orderNo: string }>): void {
  const date = todayStr()
  let max = 0
  for (const order of orders) {
    if (order.orderNo.startsWith(date)) {
      const seq = Number(order.orderNo.slice(date.length))
      if (Number.isFinite(seq) && seq > max) max = seq
    }
  }
  dailySeqDate = date
  dailySeq = max
}

/** 购物车条目键：dishId + 规格文本 */
export function itemKey(dishId: string, specText?: string): string {
  return specText ? `${dishId}#${specText}` : dishId
}
