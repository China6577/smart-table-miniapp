/** 短 ID 生成：前缀 + 时间基36 + 随机尾串（如 d1a2b3c4x9） */
export function genId(prefix: string): string {
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${prefix}${time}${rand}`
}
