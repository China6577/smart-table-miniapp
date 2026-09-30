import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from '@nestjs/websockets'
import { WebSocket } from 'ws'
import type { RealtimeOrder } from './realtime.service'

/** 每个连接的订阅范围：admin = 后台/KDS 全量订单流；table = 顾客按桌号过滤 */
interface ClientScope {
  scope: 'admin' | 'table'
  tableCode?: string
}

interface SubscribePayload {
  token?: string
  tableCode?: string
}

/**
 * 实时推送网关（原生 WebSocket，路径 /api/ws）：
 * 选原生 ws 而非 socket.io —— 微信小程序 wx.connectSocket 可直连、
 * 浏览器端用原生 WebSocket，三端零客户端依赖。
 * 消息协议：JSON 双向 { event, data }（WsAdapter 标准路由格式）。
 */
@WebSocketGateway({ path: '/api/ws' })
export class RealtimeGateway implements OnGatewayConnection<WebSocket>, OnGatewayDisconnect<WebSocket> {
  private readonly logger = new Logger('RealtimeGateway')
  private readonly clients = new Map<WebSocket, ClientScope>()

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: WebSocket): void {
    this.clients.set(client, { scope: 'table' })
    this.logger.log(`客户端接入（当前 ${this.clients.size} 个连接）`)
  }

  handleDisconnect(client: WebSocket): void {
    this.clients.delete(client)
  }

  /**
   * 订阅：
   * - 员工 JWT → 全量订单流（商家后台 + 厨房 KDS）
   * - tableCode → 仅本桌订单流（顾客小程序）
   */
  @SubscribeMessage('subscribe')
  async onSubscribe(@MessageBody() data: SubscribePayload, @ConnectedSocket() client: WebSocket): Promise<void> {
    try {
      if (data?.token) {
        const payload = await this.jwtService.verifyAsync<{ sub?: string }>(data.token)
        if (payload?.sub) {
          this.clients.set(client, { scope: 'admin' })
          this.send(client, 'subscribed', { scope: 'admin' })
          return
        }
      }
      if (data?.tableCode) {
        this.clients.set(client, { scope: 'table', tableCode: data.tableCode })
        this.send(client, 'subscribed', { scope: 'table', tableCode: data.tableCode })
      }
    } catch {
      // 令牌无效：保持未订阅状态，客户端以轮询兜底
      this.send(client, 'error', { message: '订阅令牌无效' })
    }
  }

  /** 订单事件广播：员工端全量，顾客端按桌号 */
  emitOrderChange(kind: 'created' | 'status', order: RealtimeOrder): void {
    const message = JSON.stringify({ event: 'order:changed', data: { kind, order } })
    for (const [client, meta] of this.clients) {
      if (client.readyState !== WebSocket.OPEN) continue
      if (meta.scope === 'admin' || meta.tableCode === order.tableCode) client.send(message)
    }
  }

  private send(client: WebSocket, event: string, data: unknown): void {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ event, data }))
  }
}
