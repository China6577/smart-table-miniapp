/** 金额/数量/时间等展示格式化工具 */

/** 分转元（后端契约为分，前端展示为元） */
export function fenToYuan(fen: number): number {
  return Math.round(fen) / 100
}

/** 元转分 */
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100)
}

/** 保留两位小数（规避浮点误差） */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 金额展示：整数不带小数，小数保留两位 */
export function formatAmount(n: number): string {
  const v = round2(n)
  return Number.isInteger(v) ? `¥${v}` : `¥${v.toFixed(2)}`
}

/** 数字千分位 */
export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** 2026-08-26 14:30 */
export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 14:30 */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 2026-08-26 */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 当天 00:00 的时间戳 */
export function startOfDay(ts: number = Date.now()): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** n 天前 00:00 的时间戳（days=1 即昨天） */
export function daysAgo(days: number, base: number = Date.now()): number {
  return startOfDay(base) - days * 86_400_000
}

/** 距今耗时，如「3 分」「1 时 12 分」 */
export function elapsedText(from: number, to: number = Date.now()): string {
  const sec = Math.max(0, Math.floor((to - from) / 1000))
  if (sec < 60) return `${sec} 秒`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} 时 ${m} 分` : `${h} 时`
}

/** 日期字符串（yyyy-MM-dd）→ 当天 00:00 时间戳 */
export function dateStrToTs(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** Date → yyyy-MM-dd */
export function tsToDateStr(ts: number): string {
  return formatDate(ts)
}
