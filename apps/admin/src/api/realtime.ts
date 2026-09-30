/**
 * WebSocket 实时通道（http 模式专用，mock 模式由 BroadcastChannel 覆盖）：
 * - 连接 /api/ws 并以员工 JWT 订阅全量订单流（后台 + KDS 共用）
 * - 断线指数退避重连，登录前每 5 秒重试取令牌
 * - 开发环境经 Vite 代理（ws: true），生产由反向代理转发升级请求
 */
import { appConfig } from '@/config'
import type { Order } from '@/types/model'
import { getStoredToken } from './request'

export interface RealtimeOrderEvent {
  kind: 'created' | 'status'
  order: Order
}

const MAX_RETRY = 5

/** 连接实时通道；返回关闭函数 */
export function connectRealtime(onOrderEvent: (event: RealtimeOrderEvent) => void): () => void {
  let ws: WebSocket | null = null
  let retry = 0
  let closed = false
  let timer: number | undefined

  function schedule(delay: number): void {
    timer = window.setTimeout(connect, delay)
  }

  function connect(): void {
    if (closed) return
    const token = getStoredToken()
    if (!token) {
      // 未登录：稍后重试（登录后即可自动接入）
      schedule(5_000)
      return
    }
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    ws = new WebSocket(`${proto}://${location.host}${appConfig.apiBaseUrl}/ws`)
    ws.onopen = () => {
      retry = 0
      ws?.send(JSON.stringify({ event: 'subscribe', data: { token } }))
    }
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { event: string; data: RealtimeOrderEvent }
        if (msg.event === 'order:changed') onOrderEvent(msg.data)
      } catch {
        // 非 JSON 帧忽略
      }
    }
    ws.onclose = () => {
      if (closed) return
      retry = Math.min(retry + 1, MAX_RETRY)
      schedule(Math.min(1_000 * 2 ** retry, 30_000))
    }
  }

  connect()
  return () => {
    closed = true
    if (timer) clearTimeout(timer)
    ws?.close()
  }
}
