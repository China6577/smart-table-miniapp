import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  DiningTableEntity,
  DishEntity,
  OrderEntity,
  OrderEventEntity,
  OrderItemEntity,
} from '../../database/entities'
import { RealtimeModule } from '../realtime/realtime.module'
import { OrderController } from './order.controller'
import { OrderService } from './order.service'
import { OrderNoService } from './order-no.service'

@Module({
  imports: [
    RealtimeModule,
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, OrderEventEntity, DishEntity, DiningTableEntity]),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderNoService],
  exports: [OrderService, OrderNoService],
})
export class OrderModule {}
