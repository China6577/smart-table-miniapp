import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { Public } from '../../common/public.decorator'
import { RESTAURANT_INFO } from '../../config'
import { DishService } from '../menu/dish.service'
import { CategoryService } from '../menu/category.service'
import { OrderService } from '../order/order.service'
import { CreateOrderDto } from '../order/order.dto'

/**
 * 顾客端接口（免登录，设计文档 6.2）：
 * 扫码进入小程序后按桌号点餐，无需注册与个人信息。
 */
@Public()
@Controller('customer')
export class CustomerController {
  constructor(
    private readonly dishService: DishService,
    private readonly categoryService: CategoryService,
    private readonly orderService: OrderService,
  ) {}

  @Get('restaurant')
  restaurant() {
    return RESTAURANT_INFO
  }

  /** 分类列表：首位拼装「热门推荐」虚拟分类（聚合 isHot 菜品） */
  @Get('categories')
  async categories() {
    const list = await this.categoryService.list()
    return [{ id: 'hot', name: '热门推荐' }, ...list.filter((c) => c.status === 1).map((c) => ({ id: c.id, name: c.name }))]
  }

  @Get('dishes')
  dishes(@Query('categoryId') categoryId?: string, @Query('keyword') keyword?: string) {
    return this.dishService.listForCustomer({ categoryId, keyword })
  }

  @Get('dishes/:id')
  dishDetail(@Param('id') id: string) {
    return this.dishService.detailForCustomer(id)
  }

  @Post('orders')
  submitOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.submit(dto)
  }

  /** 本桌当日订单；未带 tableCode 时返回当日全部（演示用） */
  @Get('orders')
  myOrders(@Query('tableCode') tableCode?: string) {
    return this.orderService.listForCustomer(tableCode)
  }

  @Get('orders/:orderNo')
  orderDetail(@Param('orderNo') orderNo: string) {
    return this.orderService.detail(orderNo)
  }

  @Post('orders/:orderNo/cancel')
  cancelOrder(@Param('orderNo') orderNo: string) {
    return this.orderService.customerCancel(orderNo)
  }
}
