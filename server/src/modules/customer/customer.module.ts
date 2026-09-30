import { Module } from '@nestjs/common'
import { CustomerController } from './customer.controller'
import { MenuModule } from '../menu/menu.module'
import { OrderModule } from '../order/order.module'

/** 顾客端聚合模块：复用菜单与订单模块的服务，不直接持有仓储 */
@Module({
  imports: [MenuModule, OrderModule],
  controllers: [CustomerController],
})
export class CustomerModule {}
