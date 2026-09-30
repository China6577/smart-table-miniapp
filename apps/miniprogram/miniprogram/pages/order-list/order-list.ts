import { getMyOrders } from '../../services/order-service'
import { showError } from '../../services/request'
import { subscribeTableOrders } from '../../services/realtime-service'
import { cartStore } from '../../store/cart-store'
import { getStatusClass, getStatusMeta } from '../../utils/order-status'
import { formatDateTime } from '../../utils/format'
import type { Order } from '../../types/model'

interface OrderVM extends Order {
  statusText: string
  statusClass: string
  timeText: string
}

interface OrderListData {
  orders: OrderVM[]
  loading: boolean
}

type OrderListCustom = {
  unsubscribeRealtime?: () => void
  loadOrders(): Promise<void>
  onOrderTap(e: WechatMiniprogram.TouchEvent): void
  goOrdering(): void
}

/** 我的订单列表：本机历史订单，点击查看状态详情 */
Page<OrderListData, OrderListCustom>({
  data: {
    orders: [],
    loading: true,
  },

  unsubscribeRealtime: undefined,

  onShow() {
    this.loadOrders()
    // 订阅本桌实时流：状态推送即时刷新列表
    if (!this.unsubscribeRealtime) {
      const { tableCode } = cartStore.getState()
      if (tableCode) {
        this.unsubscribeRealtime = subscribeTableOrders(tableCode, () => this.loadOrders())
      }
    }
  },

  onHide() {
    this.unsubscribeRealtime?.()
    this.unsubscribeRealtime = undefined
  },

  onUnload() {
    this.unsubscribeRealtime?.()
    this.unsubscribeRealtime = undefined
  },

  async loadOrders() {
    this.setData({ loading: true })
    try {
      const orders = await getMyOrders()
      this.setData({
        orders: orders.map((order) => ({
          ...order,
          statusText: getStatusMeta(order.status).text,
          statusClass: getStatusClass(order.status),
          timeText: formatDateTime(order.createdAt),
        })),
        loading: false,
      })
    } catch (e) {
      this.setData({ loading: false })
      showError(e instanceof Error ? e.message : '订单加载失败')
    }
  },

  onOrderTap(e: WechatMiniprogram.TouchEvent) {
    const { orderNo } = e.currentTarget.dataset as { orderNo: string }
    wx.navigateTo({ url: `/pages/order-detail/order-detail?orderNo=${orderNo}` })
  },

  goOrdering() {
    wx.reLaunch({ url: '/pages/index/index' })
  },
})
