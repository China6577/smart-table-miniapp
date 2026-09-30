import { getCategories, getDishes, getRestaurant } from '../../services/menu-service'
import { cartStore } from '../../store/cart-store'
import { resolveTableCode } from '../../utils/scene'
import type { CartItem, Category, Dish, RestaurantInfo, SpecSelection } from '../../types/model'

interface DishVM extends Dish {
  cartCount: number
}

/** 飞入购物车动画状态：JS 逐帧驱动（15 帧/450ms），跨端可靠 */
interface FlyState {
  active: boolean
  left: number
  top: number
  scale: number
}

interface IndexData {
  restaurant: RestaurantInfo
  tableCode: string
  categories: Category[]
  activeCategory: string
  dishes: DishVM[]
  loading: boolean
  cartCount: number
  cartAmount: number
  cartItems: CartItem[]
  showCart: boolean
  specDish: Dish | null
  fly: FlyState
}

/** 页面自定义成员（实例字段 + 事件/方法），供 Page 泛型做严格类型推导 */
type IndexCustom = {
  allDishes: Dish[]
  unsubscribe?: () => void
  /** 购物车图标中心坐标（飞入动画落点），onReady/onShow 后查询缓存 */
  cartIconPos?: { x: number; y: number }
  flyRestartTimer?: number
  flyTimer?: number
  queryCartIcon(): void
  flyToCart(x: number, y: number): void
  loadMenu(silent?: boolean): Promise<void>
  syncCart(): void
  refreshDishes(): void
  selectCategory(e: WechatMiniprogram.TouchEvent): void
  onAddDish(e: WechatMiniprogram.CustomEvent<{ dish: Dish; x?: number; y?: number }>): void
  onDishCountChange(e: WechatMiniprogram.CustomEvent<{ dish: Dish; delta: number; x?: number; y?: number }>): void
  onSpecConfirm(e: WechatMiniprogram.CustomEvent<{ dish: Dish } & SpecSelection & { count: number }>): void
  onSpecClose(): void
  onDishDetail(e: WechatMiniprogram.CustomEvent<{ dish: Dish }>): void
  openCart(): void
  closeCart(): void
  onCartMinus(e: WechatMiniprogram.CustomEvent<{ key: string }>): void
  onCartPlus(e: WechatMiniprogram.CustomEvent<{ key: string }>): void
  onCartRemove(e: WechatMiniprogram.CustomEvent<{ key: string }>): void
  onCartClear(): void
  goConfirm(): void
  goSearch(): void
  goOrders(): void
}

Page<IndexData, IndexCustom>({
  data: {
    restaurant: { name: '', announcement: '', phone: '', address: '', businessHours: '' },
    tableCode: 'A08',
    categories: [],
    activeCategory: 'hot',
    dishes: [],
    loading: true,
    cartCount: 0,
    cartAmount: 0,
    cartItems: [],
    showCart: false,
    specDish: null,
    fly: { active: false, left: 0, top: 0, scale: 1 },
  },

  allDishes: [],

  onLoad(query) {
    // 扫码进入：优先二维码携带的桌号；开发/分享进入时兜底 A08
    const table = resolveTableCode(query ?? {}) ?? 'A08'
    cartStore.setTable(table)
    this.setData({ tableCode: cartStore.getState().tableCode })

    this.unsubscribe = cartStore.subscribe(() => this.syncCart())
    this.syncCart()
    this.loadMenu()
  },

  onShow() {
    this.syncCart()
    // 静默刷新菜单：后台改规格/价格/上下架后回到本页即可见，不打断浏览（无 loading）
    this.loadMenu(true)
    this.queryCartIcon()
  },

  onReady() {
    // 飞入动画落点：渲染完成后测一次购物车图标中心
    this.queryCartIcon()
  },

  onUnload() {
    this.unsubscribe?.()
    if (this.flyRestartTimer) clearTimeout(this.flyRestartTimer)
    if (this.flyTimer) clearInterval(this.flyTimer)
  },

  /** 测量购物车图标中心坐标（飞入动画落点；图标随安全区变化，onShow 复查兜底） */
  queryCartIcon() {
    const comp = this.selectComponent('#cart-bar')
    if (!comp) return
    wx.createSelectorQuery()
      .in(comp)
      .select('.cart-icon')
      .boundingClientRect((rect) => {
        if (rect) this.cartIconPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      })
      .exec()
  },

  /**
   * 飞入购物车动画：小球自 + 按钮沿抛物线落入购物车图标。
   * JS 逐帧驱动：横向匀速、纵向二次加速（ease-in）合成抛物线并逐渐缩小；
   * 每帧 setData 直写位置，规避 CSS 动画/过渡对动态值的渲染兼容问题。
   */
  flyToCart(x: number, y: number) {
    const target = this.cartIconPos
    if (!target) return
    if (this.flyTimer) clearInterval(this.flyTimer)
    if (this.flyRestartTimer) clearTimeout(this.flyRestartTimer)
    // 24rpx 小球中心对齐指尖（约 -7px）
    const sx = x - 7
    const sy = y - 7
    const tx = target.x - 7
    const ty = target.y - 7
    const FRAMES = 15
    const STEP_MS = 30
    let frame = 0
    this.setData({ fly: { active: true, left: sx, top: sy, scale: 1 } })
    const timer = setInterval(() => {
      frame += 1
      const p = Math.min(frame / FRAMES, 1)
      const ease = p * p
      this.setData({
        'fly.left': sx + (tx - sx) * p,
        'fly.top': sy + (ty - sy) * ease,
        'fly.scale': 1 - 0.7 * p,
      })
      if (p >= 1) {
        clearInterval(timer)
        this.flyTimer = undefined
        // 落点短暂停留后收起，与购物车图标 pop 动画衔接
        this.flyRestartTimer = setTimeout(() => this.setData({ 'fly.active': false }), 80)
      }
    }, STEP_MS)
    this.flyTimer = timer
  },

  async loadMenu(silent = false) {
    if (!silent) this.setData({ loading: true })
    try {
      const [restaurant, categories, dishes] = await Promise.all([
        getRestaurant(),
        getCategories(),
        getDishes(),
      ])
      this.allDishes = dishes
      this.setData({ restaurant, categories, loading: false })
      this.refreshDishes()
    } catch (e) {
      this.setData({ loading: false })
      // 静默刷新失败保留旧菜单不打扰顾客；首次加载才提示
      if (!silent) wx.showToast({ title: '菜单加载失败，请下拉重试', icon: 'none' })
    }
  },

  /** 按当前分类过滤菜品并附加购物车角标数量 */
  refreshDishes() {
    const active = this.data.activeCategory
    const countMap = cartStore.getDishCountMap()
    const dishes = this.allDishes
      .filter((dish) => (active === 'hot' ? dish.isHot : dish.categoryId === active))
      .map((dish) => ({ ...dish, cartCount: countMap[dish.id] ?? 0 }))
    this.setData({ dishes })
  },

  /** 购物车状态变化 → 同步底栏/弹层/角标 */
  syncCart() {
    const { items } = cartStore.getState()
    const empty = items.length === 0
    this.setData({
      cartItems: items,
      cartCount: cartStore.totalCount(),
      cartAmount: cartStore.totalAmount(),
      showCart: empty ? false : this.data.showCart,
    })
    this.refreshDishes()
  },

  selectCategory(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset as { id: string }
    if (id === this.data.activeCategory) return
    this.setData({ activeCategory: id })
    this.refreshDishes()
  },

  /** 加购：无规格直接加入（带飞入动画）；有规格弹出选择层 */
  onAddDish(e: WechatMiniprogram.CustomEvent<{ dish: Dish; x?: number; y?: number }>) {
    const { dish, x, y } = e.detail
    if (dish.specs && dish.specs.length) {
      this.setData({ specDish: dish })
    } else {
      if (x !== undefined && y !== undefined) this.flyToCart(x, y)
      cartStore.addDish(dish)
    }
  },

  onSpecConfirm(e: WechatMiniprogram.CustomEvent<{ dish: Dish } & SpecSelection & { count: number }>) {
    const { dish, optionIds, specText, unitPrice, count } = e.detail
    cartStore.addDish(dish, { optionIds, specText, unitPrice }, count)
    this.setData({ specDish: null })
  },

  onSpecClose() {
    this.setData({ specDish: null })
  },

  /** 列表卡片步进器：无规格菜品直接加减购物车数量；加购触发飞入动画 */
  onDishCountChange(e: WechatMiniprogram.CustomEvent<{ dish: Dish; delta: number; x?: number; y?: number }>) {
    const { dish, delta, x, y } = e.detail
    if (delta > 0 && x !== undefined && y !== undefined) this.flyToCart(x, y)
    cartStore.changeDishCount(dish.id, delta)
  },

  onDishDetail(e: WechatMiniprogram.CustomEvent<{ dish: Dish }>) {
    wx.navigateTo({ url: `/pages/dish-detail/dish-detail?id=${e.detail.dish.id}` })
  },

  openCart() {
    this.setData({ showCart: true })
  },

  closeCart() {
    this.setData({ showCart: false })
  },

  onCartMinus(e: WechatMiniprogram.CustomEvent<{ key: string }>) {
    cartStore.changeCount(e.detail.key, -1)
  },

  onCartPlus(e: WechatMiniprogram.CustomEvent<{ key: string }>) {
    cartStore.changeCount(e.detail.key, 1)
  },

  onCartRemove(e: WechatMiniprogram.CustomEvent<{ key: string }>) {
    cartStore.removeItem(e.detail.key)
  },

  onCartClear() {
    wx.showModal({
      title: '清空购物车',
      content: '确定要清空已选的菜品吗？',
      confirmColor: '#00a862',
      success: (res) => {
        if (res.confirm) cartStore.clear()
      },
    })
  },

  goConfirm() {
    if (this.data.cartCount === 0) return
    this.setData({ showCart: false })
    wx.navigateTo({ url: '/pages/order-confirm/order-confirm' })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/order-list/order-list' })
  },

  onShareAppMessage() {
    return {
      title: `${this.data.restaurant.name} · 在线点餐`,
      path: `/pages/index/index?table=${this.data.tableCode}`,
    }
  },
})
