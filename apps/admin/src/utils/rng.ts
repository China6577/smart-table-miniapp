/**
 * 种子随机数生成器（mulberry32）：
 * Mock 种子数据用它保证每次生成结果一致，刷新页面后报表数字稳定。
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 随机整数 [min, max]（含边界） */
export function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

/** 按权重挑选一项 */
export function pickWeighted<T>(rand: () => number, items: T[], weightOf: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0)
  let r = rand() * total
  for (const item of items) {
    r -= weightOf(item)
    if (r <= 0) return item
  }
  return items[items.length - 1]
}
