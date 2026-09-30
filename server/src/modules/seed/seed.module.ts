import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  CategoryEntity,
  DiningTableEntity,
  DishEntity,
  OrderEntity,
  OrderItemEntity,
  SpecGroupEntity,
  SpecOptionEntity,
  StaffEntity,
} from '../../database/entities'
import { SeedService } from './seed.service'
import { RedisModule } from '../redis/redis.module'
import { OrderModule } from '../order/order.module'

/** 演示数据播种（应用启动时按需执行；依赖 OrderModule 提供的订单号服务） */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoryEntity,
      DishEntity,
      SpecGroupEntity,
      SpecOptionEntity,
      DiningTableEntity,
      StaffEntity,
      OrderEntity,
      OrderItemEntity,
    ]),
    RedisModule,
    OrderModule,
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
