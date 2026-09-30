import { createStore } from '../utils/store'
import type { CartItem, Dish, SpecSelection } from '../types/model'

const CART_KEY = 'st_cart_v1'

interface CartState {
  tableCode: string
  items: CartItem[]
}

/** 购物车 + 当前桌号的全局状态，本地持久化（同一桌号内刷新不丢失） */
function loadPersisted(): CartState {
  try {
    const saved = wx.getStorageSync(CART_KEY)
    if (
      saved &&
      typeof saved.tableCode === 'string' &&
      Array.isArray(saved.items)
    ) {
      return saved as CartState
    }
  } catch (e) {
    // 存储读取异常时按空购物车处理
  }
  return { tableCode: '', items: [] }
}

const store = createStore<CartState>(loadPersisted())

function persist() {
  try {
    wx.setStorageSync(CART_KEY, store.getState())
  } catch (e) {
    // 存储写入失败不影响点餐流程
  }
}

/** 生成购物车条目唯一键：菜品 + 规格 */
function itemKey(dishId: string, specText?: string): string {
  return `${dishId}|${specText ?? ''}`
}

export const cartStore = {
  getState: store.getState,
  subscribe: store.subscribe,

  /** 设置当前桌号；换桌时清空购物车，避免串桌 */
  setTable(code: string) {
    const { tableCode } = store.getState()
    if (tableCode === code) return
    store.setState({ tableCode: code, items: [] })
    persist()
  },

  /** 加入菜品（同菜品同规格自动合并数量） */
  addDish(dish: Dish, spec: SpecSelection | null = null, count = 1) {
    const { items } = store.getState()
    const key = itemKey(dish.id, spec?.specText)
    const next = [...items]
    const index = next.findIndex((item) => item.key === key)
    if (index >= 0) {
      next[index] = { ...next[index], count: next[index].count + count }
    } else {
      next.push({
        key,
        dishId: dish.id,
        name: dish.name,
        image: dish.image,
        unitPrice: spec ? spec.unitPrice : dish.price,
        specText: spec?.specText,
        count,
      })
    }
    store.setState({ items: next })
    persist()
  },

  /** 列表卡片步进器：无规格菜品按 dishId 快捷加减（规格条目必须走规格弹层） */
  changeDishCount(dishId: string, delta: number) {
    this.changeCount(itemKey(dishId), delta)
  },

  /** 数量增减，减到 0 时移除该条目 */
  changeCount(key: string, delta: number) {
    const { items } = store.getState()
    const next: CartItem[] = []
    for (const item of items) {
      if (item.key !== key) {
        next.push(item)
        continue
      }
      const count = item.count + delta
      if (count > 0) next.push({ ...item, count })
    }
    store.setState({ items: next })
    persist()
  },

  removeItem(key: string) {
    store.setState({ items: store.getState().items.filter((item) => item.key !== key) })
    persist()
  },

  /** 「再来一单」：按订单明细批量回填购物车 */
  addRawItems(raw: Array<{ dishId: string; name: string; image: string; unitPrice: number; specText?: string; quantity: number }>) {
    const { items } = store.getState()
    const next = [...items]
    for (const line of raw) {
      const key = itemKey(line.dishId, line.specText)
      const index = next.findIndex((item) => item.key === key)
      if (index >= 0) {
        next[index] = { ...next[index], count: next[index].count + line.quantity }
      } else {
        next.push({
          key,
          dishId: line.dishId,
          name: line.name,
          image: line.image,
          unitPrice: line.unitPrice,
          specText: line.specText,
          count: line.quantity,
        })
      }
    }
    store.setState({ items: next })
    persist()
  },

  clear() {
    store.setState({ items: [] })
    persist()
  },

  /** 菜品维度的数量汇总（用于列表角标） */
  getDishCountMap(): Record<string, number> {
    const map: Record<string, number> = {}
    for (const item of store.getState().items) {
      map[item.dishId] = (map[item.dishId] ?? 0) + item.count
    }
    return map
  },

  totalCount(): number {
    return store.getState().items.reduce((sum, item) => sum + item.count, 0)
  },

  totalAmount(): number {
    return store.getState().items.reduce((sum, item) => sum + item.unitPrice * item.count, 0)
  },
}
