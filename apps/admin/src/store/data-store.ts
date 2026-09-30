/**
 * 实时数据镜像（全站唯一数据源）：
 * - mock 模式：订阅 Mock 数据库（本页写入 + 其他标签页广播）
 * - http 模式：WebSocket 推送即时合并订单 + 写操作后按路径刷新 + 低频轮询兜底
 * 两种模式下页面组件消费方式完全一致（useDataStore），切换零改动。
 */
import { create } from 'zustand'
import { appConfig } from '@/config'
import { request, onApiMutation } from '@/api/request'
import { connectRealtime, type RealtimeOrderEvent } from '@/api/realtime'
import { subscribeDb, getDb, resetDb, type MockDb } from '@/mock/db'
import { syncOrderNoSeq } from '@/utils/id'
import type { Category, DiningTable, Dish, Order, Staff } from '@/types/model'

interface DataState {
  version: number
  orders: Order[]
  dishes: Dish[]
  categories: Category[]
  tables: DiningTable[]
  staff: Staff[]
  /** 数据库变更后同步（mock 广播 / http 轮询共用入口） */
  sync: (db: MockDb) => void
  /** 重置演示数据（mock 重建本地库 / http 调用后端重置） */
  reset: () => Promise<void>
}

const useMockMode = appConfig.apiMode === 'mock'
const initial: MockDb = useMockMode
  ? getDb()
  : { version: 0, orders: [], dishes: [], categories: [], tables: [], staff: [] }

export const useDataStore = create<DataState>((set) => ({
  version: initial.version,
  orders: initial.orders,
  dishes: initial.dishes,
  categories: initial.categories,
  tables: initial.tables,
  staff: initial.staff,
  sync: (db) =>
    set({
      version: db.version,
      orders: db.orders,
      dishes: db.dishes,
      categories: db.categories,
      tables: db.tables,
      staff: db.staff,
    }),
  reset: async () => {
    if (useMockMode) {
      const db = resetDb()
      syncOrderNoSeq(db.orders)
      set({
        version: db.version,
        orders: db.orders,
        dishes: db.dishes,
        categories: db.categories,
        tables: db.tables,
        staff: db.staff,
      })
      return
    }
    await request('POST', '/dev/reset-demo')
    await mirror.pullAll()
  },
}))

if (useMockMode) {
  // 模块加载即订阅：数据库任何变更（含其他标签页）自动同步到 React
  subscribeDb((db) => {
    syncOrderNoSeq(db.orders)
    useDataStore.getState().sync(db)
  })
}

// ---------------- http 模式实时镜像 ----------------

/** 兜底轮询周期：实时性由 WebSocket 推送保障，轮询只做漂移校正 */
const ORDERS_INTERVAL_MS = 60_000
const BASE_INTERVAL_MS = 60_000
/** 写操作后镜像刷新的防抖窗口（连续操作合并为一次拉取） */
const MUTATION_DEBOUNCE_MS = 300

/** 基础数据域：变更后需要重拉镜像 */
const BASE_PATH_PREFIXES = ['/admin/dishes', '/admin/categories', '/admin/tables', '/admin/staff']

const mirror = {
  running: false,
  ordersInflight: false,
  baseInflight: false,
  disconnectRealtime: null as (() => void) | null,
  mutationTimer: undefined as number | undefined,
  pendingPullOrders: false,
  pendingPullBase: false,

  start(): void {
    if (this.running) return
    this.running = true
    void this.pullOrders()
    void this.pullBase()
    window.setInterval(() => void this.pullOrders(), ORDERS_INTERVAL_MS)
    window.setInterval(() => void this.pullBase(), BASE_INTERVAL_MS)
    // 标签页回到前台立即刷新（从 KDS 大屏切回时数据不滞后）
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.pullOrders()
        void this.pullBase()
      }
    })
    // WebSocket 推送：订单创建/流转即时并入本地镜像
    this.disconnectRealtime = connectRealtime((event) => this.mergeOrder(event))
    // 本页写操作成功后按路径刷新镜像（订单域由 WS 推送覆盖，无需重拉）
    onApiMutation((path) => this.onMutation(path))
  },

  /** WS 订单事件 → 本地合并（新订单置顶 / 已存在按单号替换） */
  mergeOrder(event: RealtimeOrderEvent): void {
    const store = useDataStore.getState()
    const { order } = event
    const index = store.orders.findIndex((o) => o.orderNo === order.orderNo)
    const orders =
      index >= 0 ? store.orders.map((o) => (o.orderNo === order.orderNo ? order : o)) : [order, ...store.orders]
    // version 递增驱动依赖订单数据的派生查询（Dashboard 统计等）重新拉取
    store.sync({
      version: store.version + 1,
      orders,
      dishes: store.dishes,
      categories: store.categories,
      tables: store.tables,
      staff: store.staff,
    })
  },

  /** 本页写操作成功回调：基础数据重拉、重置演示数据全量拉 */
  onMutation(path: string): void {
    if (BASE_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      this.pendingPullBase = true
    } else if (path.startsWith('/dev/reset')) {
      this.pendingPullOrders = true
      this.pendingPullBase = true
    } else {
      // 订单域变更已由 WebSocket 即时推送合并
      return
    }
    if (this.mutationTimer) clearTimeout(this.mutationTimer)
    this.mutationTimer = window.setTimeout(() => {
      const pullOrders = this.pendingPullOrders
      const pullBase = this.pendingPullBase
      this.pendingPullOrders = false
      this.pendingPullBase = false
      if (pullOrders) void this.pullOrders()
      if (pullBase) void this.pullBase()
    }, MUTATION_DEBOUNCE_MS)
  },

  async pullAll(): Promise<void> {
    await Promise.all([this.pullOrders(), this.pullBase()])
  },

  async pullOrders(): Promise<void> {
    if (this.ordersInflight) return
    this.ordersInflight = true
    try {
      const page = await request<{ list: Order[]; total: number }>('GET', '/admin/orders', {
        params: { page: 1, pageSize: 2000 },
      })
      const store = useDataStore.getState()
      store.sync({
        version: store.version + 1,
        orders: page.list,
        dishes: store.dishes,
        categories: store.categories,
        tables: store.tables,
        staff: store.staff,
      })
    } catch {
      // 后端暂不可达时保留上一份数据，下轮重试
    } finally {
      this.ordersInflight = false
    }
  },

  async pullBase(): Promise<void> {
    if (this.baseInflight) return
    this.baseInflight = true
    try {
      const [dishes, categories, tables, staff] = await Promise.all([
        request<Dish[]>('GET', '/admin/dishes'),
        request<Category[]>('GET', '/admin/categories'),
        request<DiningTable[]>('GET', '/admin/tables'),
        request<Staff[]>('GET', '/admin/staff'),
      ])
      const store = useDataStore.getState()
      store.sync({
        version: store.version + 1,
        orders: store.orders,
        dishes,
        categories,
        tables,
        staff,
      })
    } catch {
      // 同上：静默重试
    } finally {
      this.baseInflight = false
    }
  },
}

if (!useMockMode) {
  mirror.start()
}
