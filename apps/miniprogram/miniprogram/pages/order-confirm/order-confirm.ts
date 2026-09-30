import { cartStore } from '../../store/cart-store'
import { generateClientToken, submitOrder } from '../../services/order-service'
import { getRestaurant } from '../../services/menu-service'
import { showError } from '../../services/request'
import type { CartItem, RestaurantInfo } from '../../types/model'

interface OrderConfirmData {
  restaurant: RestaurantInfo
  tableCode: string
  items: CartItem[]
  itemCount: number
  totalAmount: number
  remark: string
  submitting: boolean
}

type OrderConfirmCustom = {
  onRemarkInput(e: WechatMiniprogram.CustomEvent<{ value: string }>): void
  goOrdering(): void
  onSubmit(): Promise<void>
}

/** 确认订单页：桌号 + 菜品清单 + 备注 → 提交订单 */
Page<OrderConfirmData, OrderConfirmCustom>({
  data: {
    restaurant: { name: '', announcement: '', phone: '', address: '', businessHours: '' },
    tableCode: 'A08',
    items: [],
    itemCount: 0,
    totalAmount: 0,
    remark: '',
    submitting: false,
  },

  async onShow() {
    const { tableCode, items } = cartStore.getState()
    this.setData({
      tableCode,
      items,
      itemCount: cartStore.totalCount(),
      totalAmount: cartStore.totalAmount(),
    })
    if (!this.data.restaurant.name) {
      const restaurant = await getRestaurant()
      this.setData({ restaurant })
    }
  },

  onRemarkInput(e: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ remark: e.detail.value })
  },

  goOrdering() {
    wx.navigateBack()
  },

  async onSubmit() {
    if (this.data.submitting) return
    const { items, tableCode, remark } = this.data
    if (!items.length) {
      showError('购物车为空，请先选择菜品')
      return
    }
    this.setData({ submitting: true })
    try {
      const order = await submitOrder({
        tableCode,
        items,
        remark: remark.trim(),
        clientToken: generateClientToken(),
      })
      // 下单成功后清空购物车并跳转订单状态页（redirect 防止回退到确认页重复下单）
      cartStore.clear()
      wx.showToast({ title: '下单成功', icon: 'success' })
      setTimeout(() => {
        wx.redirectTo({ url: `/pages/order-detail/order-detail?orderNo=${order.orderNo}` })
      }, 400)
    } catch (e) {
      showError(e instanceof Error ? e.message : '下单失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  },
})
