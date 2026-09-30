import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CategoryEntity, DishEntity, SpecGroupEntity, SpecOptionEntity } from '../../database/entities'
import { MenuController } from './menu.controller'
import { DishService } from './dish.service'
import { CategoryService } from './category.service'

@Module({
  imports: [TypeOrmModule.forFeature([DishEntity, CategoryEntity, SpecGroupEntity, SpecOptionEntity])],
  controllers: [MenuController],
  providers: [DishService, CategoryService],
  exports: [DishService, CategoryService],
})
export class MenuModule {}
