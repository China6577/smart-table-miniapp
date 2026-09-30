import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CategoryEntity, DiningTableEntity, DishEntity, OrderEntity } from '../../database/entities'
import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, DishEntity, CategoryEntity, DiningTableEntity])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
