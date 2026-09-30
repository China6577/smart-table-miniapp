import { cancelOrder, getOrderDetail } from '../../services/order-service'
import { getRestaurant } from '../../services/menu-service'
import { showError } from '../../services/request'
import { subscribeTableOrders } from '../../services/realtime-service'
import { cartStore } from '../../store/cart-store'
import { buildTimeline, getStatusMeta } from '../../utils/order-status'
import { formatDateTime } from '../../utils/format'
import type { Order, RestaurantInfo } from '../../types/model'

/** 轮询间隔：WebSocket 推送失效时的兜底频率 */
const POLL_INTERVAL = 15000

interface OrderDetailData {
  orderNo: string
  order: Order | null
  timeline: ReturnType<typeof buildTimeline>
  meta: ReturnType<typeof getStatusMeta>
  createdText: string
  canCancel: boolean
  canReorder: boolean
  restaurant: RestaurantInfo
}

type OrderDetailCustom = {
  timer?: number
  unsubscribeRealtime?: () => void
  load(notify: boolean): Promise<void>
  applyOrder(order: Order): void
  onCopy(): void
  onCancel(): void
  onReorder(): void

}

Page<OrderDetailData, OrderDetailCustom>({
  data: {
    orderNo: '',
    order: null,
    timeline: [],
    meta: { text: '', desc: '', tone: 'active' },
    createdText: '',
    canCancel: false,
    canReorder: false,
    restaurant: { name: '', announcement: '', phone: '', address: '', businessHours: '' },
  },

  timer: undefined,
  unsubscribeRealtime: undefined,

  onLoad(query) {
    const orderNo = query?.orderNo ?? ''
    this.setData({ orderNo })
    this.load(true)
    getRestaurant().then((restaurant) => this.setData({ restaurant }))
    // WebSocket 推送即时刷新订单状态；轮询作断线兜底
    this.timer = setInterval(() => this.load(false), POLL_INTERVAL)
  },

  onShow() {
    if (this.data.orderNo) this.load(false)
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
    this.unsubscribeRealtime?.()
    this.unsubscribeRealtime = undefined
  },

  async onPullDownRefresh() {
    await this.load(false)
    wx.stopPullDownRefresh()
  },

  async load(notify: boolean) {
    if (!this.data.orderNo) return
    try {
      const order = await getOrderDetail(this.data.orderNo)
      this.applyOrder(order)
    } catch (e) {
      if (notify) {
        showError(e instanceof Error ? e.message : '订单加载失败')
      }
    }
  },

  applyOrder(order: Order) {
    const meta = getStatusMeta(order.status)
    this.setData({
      order,
      timeline: buildTimeline(order),
      meta,
      createdText: formatDateTime(order.createdAt),
      canCancel: order.status === 'PENDING',
      canReorder: order.status === 'COMPLETED' || order.status === 'CANCELLED',
    })
    // 首次拿到桌号后订阅本桌实时流，后续推送直接刷新页面
    if (!this.unsubscribeRealtime && order.tableCode) {
      this.unsubscribeRealtime = subscribeTableOrders(order.tableCode, (event) => {
        if (event.order.orderNo === this.data.orderNo) this.applyOrder(event.order)
      })
    }
  },

  onCopy() {
    wx.setClipboardData({ data: `#${this.data.orderNo}` })
  },

  onCancel() {
    wx.showModal({
      title: '取消订单',
      content: '商家接单前可自助取消，确定取消吗？',
      confirmColor: '#fa5151',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const order = await cancelOrder(this.data.orderNo)
          this.applyOrder(order)
          wx.showToast({ title: '已取消', icon: 'success' })
        } catch (e) {
          showError(e instanceof Error ? e.message : '取消失败')
        }
      },
    })
  },

  /** 再来一单：将订单明细回填购物车，回到点餐页 */
  onReorder() {
    const order = this.data.order
    if (!order || !this.data.canReorder) return
    cartStore.addRawItems(order.items)
    wx.showToast({ title: '已加入购物车', icon: 'success' })
    setTimeout(() => {
      wx.reLaunch({ url: `/pages/index/index?table=${order.tableCode}` })
    }, 400)
  },


  onShareAppMessage() {
    const { order, restaurant } = this.data
    return {
      title: order ? `「${restaurant.name}」订单 #${order.orderNo}` : '在线点餐',
      path: '/pages/index/index',
    }
  },
})
