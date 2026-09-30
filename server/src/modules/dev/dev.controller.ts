import { Controller, Post } from '@nestjs/common'
import { BusinessException } from '../../common/business.exception'
import { appConfig } from '../../config'
import { OrderService } from '../order/order.service'
import { SeedService } from '../seed/seed.service'

/**
 * 演示调试端点（/api/dev/*）：
 * 仅在 ALLOW_DEV_ENDPOINTS=true 时可用，生产环境必须关闭。
 * 供后台「顾客下单模拟器」与「重置演示数据」按钮调用。
 */
@Controller('dev')
export class DevController {
  constructor(
    private readonly orderService: OrderService,
    private readonly seedService: SeedService,
  ) {}

  @Post('simulate-order')
  simulateOrder() {
    this.ensureEnabled()
    return this.orderService.createSimulatedOrder()
  }

  @Post('reset-demo')
  async resetDemo() {
    this.ensureEnabled()
    await this.seedService.resetDemo()
    return { ok: true }
  }

  private ensureEnabled(): void {
    if (!appConfig.allowDevEndpoints) throw new BusinessException(403, '调试端点未开放')
  }
}
