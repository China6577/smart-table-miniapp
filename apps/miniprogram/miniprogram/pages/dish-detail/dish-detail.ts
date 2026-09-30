import { getDishById } from '../../services/menu-service'
import { cartStore } from '../../store/cart-store'
import type { Dish, SpecGroup, SpecOption } from '../../types/model'

interface SpecGroupVM extends SpecGroup {
  options: Array<SpecOption & { active: boolean }>
}

interface DishDetailData {
  dish: Dish | null
  groups: SpecGroupVM[]
  count: number
  unitPrice: number
  specText: string
}

type DishDetailCustom = {
  dishId: string
  onOption(e: WechatMiniprogram.TouchEvent): void
  refreshSummary(): void
  onMinus(): void
  onPlus(): void
  load(silent: boolean): Promise<void>

}

/** 菜品详情页：大图 + 规格选择 + 数量（加购在列表卡片步进器完成） */
Page<DishDetailData, DishDetailCustom>({
  data: {
    dish: null,
    groups: [],
    count: 1,
    unitPrice: 0,
    specText: '',
  },

  dishId: '',

  onLoad(query) {
    const id = query?.id
    if (!id) {
      wx.showToast({ title: '菜品不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }
    this.dishId = id
    this.load(false)
  },

  onShow() {
    // 静默刷新：后台改规格/价格后回到本页即可见（保留顾客已选的规格）
    if (this.dishId) this.load(true)
  },

  /** 拉取菜品并渲染；silent 时按（组名, 选项名）恢复顾客已选，避免刷新打断选择 */
  async load(silent: boolean) {
    const dish = await getDishById(this.dishId)
    if (!dish) {
      wx.showToast({ title: '菜品不存在或已下架', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }
    const prevSelected = new Map<string, string>()
    if (silent) {
      for (const group of this.data.groups) {
        const picked = group.options.find((o) => o.active)
        if (picked) prevSelected.set(group.name, picked.label)
      }
    }
    const groups: SpecGroupVM[] = (dish.specs ?? []).map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        active: silent ? prevSelected.get(group.name) === option.label : false,
      })),
    }))
    groups.forEach((group) => {
      // 无已选项（或已选项被删）默认第一项
      if (group.options.length && !group.options.some((o) => o.active)) group.options[0].active = true
    })
    this.setData({ dish, groups })
    this.refreshSummary()
  },

  onOption(e: WechatMiniprogram.TouchEvent) {
    const { gi, oi } = e.currentTarget.dataset as { gi: number; oi: number }
    const groups = this.data.groups.map((group, index) => {
      if (index !== Number(gi)) return group
      return {
        ...group,
        options: group.options.map((option, optionIndex) => ({
          ...option,
          active: optionIndex === Number(oi),
        })),
      }
    })
    this.setData({ groups })
    this.refreshSummary()
  },

  refreshSummary() {
    const dish = this.data.dish
    if (!dish) return
    let delta = 0
    const labels: string[] = []
    for (const group of this.data.groups) {
      for (const option of group.options) {
        if (option.active) {
          delta += option.priceDelta
          labels.push(option.label)
        }
      }
    }
    this.setData({
      unitPrice: dish.price + delta,
      specText: labels.join(' / '),
    })
  },

  onMinus() {
    if (this.data.count <= 1) return
    this.setData({ count: this.data.count - 1 })
  },

  onPlus() {
    if (this.data.count >= 99) return
    this.setData({ count: this.data.count + 1 })
  },

  onShareAppMessage() {
    const dish = this.data.dish
    return {
      title: dish ? `给你推荐「${dish.name}」` : '在线点餐',
      path: dish ? `/pages/dish-detail/dish-detail?id=${dish.id}` : '/pages/index/index',
    }
  },
})
