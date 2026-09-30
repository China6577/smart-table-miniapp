/**
 * Mock 数据库：
 * - localStorage 持久化（刷新不丢数据，含商家改动）
 * - BroadcastChannel 跨标签页实时同步：后台一个标签页接单，KDS 大屏标签页（同源路由 /kds）立即刷新
 *   这是 Phase 4 WebSocket 实时推送的浏览器内预演，接口形态一致（db version 事件）
 */
import type { Category, DiningTable, Dish, Order, Staff } from '@/types/model'
import { categories as seedCategories, dishes as seedDishes, tables as seedTables, staff as seedStaff, generateOrders } from './seed'
import { syncOrderNoSeq } from '@/utils/id'

const DB_KEY = 'smart-table-db-v1'
const CHANNEL = 'smart-table-realtime'

export interface MockDb {
  version: number
  categories: Category[]
  dishes: Dish[]
  tables: DiningTable[]
  staff: Staff[]
  orders: Order[]
}

type Listener = (db: MockDb) => void

let cache: MockDb | null = null
let lastVersion = -1
const listeners = new Set<Listener>()
let channel: BroadcastChannel | null = null

function createSeedDb(): MockDb {
  return {
    version: 1,
    categories: structuredClone(seedCategories),
    dishes: structuredClone(seedDishes),
    tables: structuredClone(seedTables),
    staff: structuredClone(seedStaff),
    orders: generateOrders(),
  }
}

function ensureChannel(): void {
  if (channel || typeof BroadcastChannel === 'undefined') return
  channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = (event: MessageEvent<{ type: string; version: number }>) => {
    if (event.data?.type === 'changed' && event.data.version !== lastVersion) {
      // 其他标签页写入：从 localStorage 重新加载并通知本页订阅者
      reloadFromStorage()
    }
  }
}

function reloadFromStorage(): void {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb
      if (typeof parsed.version === 'number') {
        cache = parsed
        lastVersion = parsed.version
        for (const listener of listeners) listener(parsed)
        return
      }
    }
  } catch {
    // 存储损坏则重新播种
  }
  cache = createSeedDb()
  lastVersion = cache.version
  persist()
  for (const listener of listeners) listener(cache)
}

/** 获取当前数据库（懒加载，无则播种） */
export function getDb(): MockDb {
  ensureChannel()
  if (cache) return cache
  reloadFromStorage()
  syncOrderNoSeq(cache!.orders)
  return cache!
}

function persist(): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache))
  } catch (error) {
    // 配额不足时仅保留内存态（演示环境几乎不会发生）
    console.warn('[mock-db] localStorage 持久化失败，数据仅存于当前标签页', error)
  }
}

/**
 * 唯一写入口：修改数据并广播。
 * 所有 Mock 接口的写操作都必须经过这里，保证版本号单调递增、跨页同步。
 */
export function saveDb(mutator: (db: MockDb) => void): MockDb {
  const db = getDb()
  mutator(db)
  db.version += 1
  persist()
  lastVersion = db.version
  for (const listener of listeners) listener(db)
  channel?.postMessage({ type: 'changed', version: db.version })
  return db
}

/** 订阅数据变更（本页写入 / 其他标签页广播均会触发） */
export function subscribeDb(listener: Listener): () => void {
  getDb()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 重置演示数据（顶栏「重置数据」按钮） */
export function resetDb(): MockDb {
  cache = createSeedDb()
  lastVersion = cache.version
  persist()
  syncOrderNoSeq(cache.orders)
  for (const listener of listeners) listener(cache)
  channel?.postMessage({ type: 'changed', version: cache.version })
  return cache
}
