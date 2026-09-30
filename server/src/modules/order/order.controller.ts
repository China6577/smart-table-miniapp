import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { CurrentStaff, type RequestStaff } from '../../common/current-staff.decorator'
import { OrderService } from './order.service'
import { CancelDto, OrderQueryDto, TransitionDto } from './order.dto'

/** 商家端订单管理 + KDS 动作（契约见 docs/01-系统设计.md 6.3 节） */
@Controller('admin/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  list(@Query() query: OrderQueryDto) {
    return this.orderService.listForAdmin(query)
  }

  @Get(':orderNo')
  detail(@Param('orderNo') orderNo: string) {
    return this.orderService.detail(orderNo)
  }

  @Post(':orderNo/accept')
  accept(@Param('orderNo') orderNo: string, @CurrentStaff() staff: RequestStaff) {
    return this.orderService.transition(orderNo, { to: 'ACCEPTED' }, staff.name)
  }

  /** KDS：待制作直接开始（PENDING 自动接单） */
  @Post(':orderNo/start')
  start(@Param('orderNo') orderNo: string, @CurrentStaff() staff: RequestStaff) {
    return this.orderService.start(orderNo, staff.name)
  }

  /** KDS：制作完成（出餐） */
  @Post(':orderNo/finish')
  finish(@Param('orderNo') orderNo: string, @CurrentStaff() staff: RequestStaff) {
    return this.orderService.transition(orderNo, { to: 'READY' }, staff.name)
  }

  /** KDS：已上桌 → 订单完成 */
  @Post(':orderNo/serve')
  serve(@Param('orderNo') orderNo: string, @CurrentStaff() staff: RequestStaff) {
    return this.orderService.transition(orderNo, { to: 'COMPLETED' }, staff.name)
  }

  @Post(':orderNo/cancel')
  cancel(@Param('orderNo') orderNo: string, @Body() dto: CancelDto, @CurrentStaff() staff: RequestStaff) {
    return this.orderService.cancel(orderNo, dto, staff.name)
  }

  /** 通用状态流转（订单详情弹窗使用） */
  @Post(':orderNo/status')
  transition(@Param('orderNo') orderNo: string, @Body() dto: TransitionDto, @CurrentStaff() staff: RequestStaff) {
    return this.orderService.transition(orderNo, dto, staff.name)
  }
}
