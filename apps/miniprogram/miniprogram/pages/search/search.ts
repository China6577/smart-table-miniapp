import { getDishes } from '../../services/menu-service'
import { cartStore } from '../../store/cart-store'
import type { Dish } from '../../types/model'

interface DishVM extends Dish {
  cartCount: number
}

interface SearchData {
  keyword: string
  hotKeywords: string[]
  results: DishVM[]
  searched: boolean
}

type SearchCustom = {
  allDishes: Dish[]
  unsubscribe?: () => void
  refreshResults(): void
  onInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void
  onClear(): void
  onHotTap(e: WechatMiniprogram.TouchEvent): void
  onAddDish(e: WechatMiniprogram.CustomEvent<{ dish: Dish }>): void
  onDishCountChange(e: WechatMiniprogram.CustomEvent<{ dish: Dish; delta: number }>): void
  onDishDetail(e: WechatMiniprogram.CustomEvent<{ dish: Dish }>): void
}

/** 菜品搜索：关键词实时匹配名称/简介 */
Page<SearchData, SearchCustom>({
  data: {
    keyword: '',
    hotKeywords: [],
    results: [],
    searched: false,
  },

  allDishes: [],

  async onLoad() {
    this.unsubscribe = cartStore.subscribe(() => this.refreshResults())
    const dishes = await getDishes()
    this.allDishes = dishes
    const hotKeywords = dishes
      .filter((dish) => dish.isHot)
      .map((dish) => dish.name)
      .slice(0, 8)
    this.setData({ hotKeywords })
    this.refreshResults()
  },

  onUnload() {
    this.unsubscribe?.()
  },

  onInput(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ keyword: e.detail.value })
    this.refreshResults()
  },

  onClear() {
    this.setData({ keyword: '', searched: false })
    this.refreshResults()
  },

  /** 列表卡片步进器：无规格菜品直接加减购物车数量 */
  onDishCountChange(e: WechatMiniprogram.CustomEvent<{ dish: Dish; delta: number }>) {
    cartStore.changeDishCount(e.detail.dish.id, e.detail.delta)
  },

  onHotTap(e: WechatMiniprogram.TouchEvent) {
    const { word } = e.currentTarget.dataset as { word: string }
    this.setData({ keyword: word })
    this.refreshResults()
  },

  /** 关键词过滤（名称/简介包含匹配） */
  refreshResults() {
    const keyword = this.data.keyword.trim().toLowerCase()
    const countMap = cartStore.getDishCountMap()
    if (!keyword) {
      this.setData({ results: [], searched: false })
      return
    }
    const results = this.allDishes
      .filter(
        (dish) =>
          dish.name.toLowerCase().includes(keyword) ||
          dish.description.toLowerCase().includes(keyword),
      )
      .map((dish) => ({ ...dish, cartCount: countMap[dish.id] ?? 0 }))
    this.setData({ results, searched: true })
  },

  onAddDish(e: WechatMiniprogram.CustomEvent<{ dish: Dish }>) {
    const dish = e.detail.dish
    if (dish.specs && dish.specs.length) {
      wx.showToast({ title: '多规格菜品请进详情选择', icon: 'none' })
      wx.navigateTo({ url: `/pages/dish-detail/dish-detail?id=${dish.id}` })
      return
    }
    cartStore.addDish(dish)
  },

  onDishDetail(e: WechatMiniprogram.CustomEvent<{ dish: Dish }>) {
    wx.navigateTo({ url: `/pages/dish-detail/dish-detail?id=${e.detail.dish.id}` })
  },
})
