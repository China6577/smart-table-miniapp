import { appConfig } from '../config/index'
import type { Order } from '../types/model'

/**
 * WebSocket 实时订阅（真实后端模式）：
 * - 订阅本桌订单流：下单 / 状态变化由服务端即时推送
 * - 原生 wx.connectSocket 直连（后端为原生 ws，无需 socket.io 客户端）
 * - 断线指数退避重连；Mock 模式直接返回空订阅
 */

/** 服务端推送的订单事件载荷（契约见 server/src/modules/realtime） */
export interface OrderEventPayload {
  kind: 'created' | 'status'
  order: Order
}

interface WsMessage {
  event: string
  data: OrderEventPayload
}

const MAX_RETRY = 5

/** http(s) 基础地址 → ws(s) 通道地址 */
function toWsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/^http/, 'ws')}/ws`
}

/**
 * 订阅指定桌号的订单事件；返回取消订阅函数。
 * 生命周期由调用方（页面）管理：onLoad/onShow 订阅，onUnload/onHide 取消。
 */
export function subscribeTableOrders(
  tableCode: string,
  onEvent: (payload: OrderEventPayload) => void,
): () => void {
  if (appConfig.useMock || !tableCode) return () => {}

  let closed = false
  let retry = 0
  let task: WechatMiniprogram.SocketTask | null = null
  let timer: number | undefined

  function schedule(delay: number): void {
    timer = setTimeout(connect, delay)
  }

  function connect(): void {
    if (closed) return
    task = wx.connectSocket({ url: toWsUrl(appConfig.apiBaseUrl) })
    task.onOpen(() => {
      retry = 0
      task?.send({ data: JSON.stringify({ event: 'subscribe', data: { tableCode } }) })
    })
    task.onMessage((res) => {
      try {
        const msg = JSON.parse(res.data as string) as WsMessage
        if (msg.event === 'order:changed') onEvent(msg.data)
      } catch (e) {
        // 无法解析的消息帧忽略
      }
    })
    task.onError(() => {
      // onError 后必定回调 onClose，统一在 onClose 里退避重连
    })
    task.onClose(() => {
      if (closed) return
      retry = Math.min(retry + 1, MAX_RETRY)
      schedule(Math.min(1_000 * 2 ** retry, 30_000))
    })
  }

  connect()
  return () => {
    closed = true
    if (timer) clearTimeout(timer)
    task?.close({})
  }
}
