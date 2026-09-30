import { Injectable } from '@nestjs/common'
import type { toOrderDto } from '../../common/mappers'
import { RealtimeGateway } from './realtime.gateway'

/** 推送载荷即订单 DTO 本体（金额已转元、时间已转毫秒，前端可直接并入状态） */
export type RealtimeOrder = ReturnType<typeof toOrderDto>

/**
 * 实时事件发布口：
 * 业务服务只依赖本服务，与网关传输细节解耦（后续换 socket.io / MQ 时只动网关）。
 */
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  /** kind = created（顾客下单）/ status（接单、制作、出餐、完成、取消） */
  publishOrder(kind: 'created' | 'status', order: RealtimeOrder): void {
    this.gateway.emitOrderChange(kind, order)
  }
}
