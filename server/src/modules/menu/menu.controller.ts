import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { Roles } from '../../common/roles.decorator'
import { DishService } from './dish.service'
import { CategoryService } from './category.service'
import { CategoryPayloadDto, CreateDishDto, DishQueryDto, UpdateDishDto, UpdateDishSpecsDto } from './menu.dto'

/** 商家端菜单：菜品 + 分类（契约见 docs/01-系统设计.md 6.3 节） */
@Controller('admin')
export class MenuController {
  constructor(
    private readonly dishService: DishService,
    private readonly categoryService: CategoryService,
  ) {}

  // ---------------- 菜品 ----------------

  @Roles('admin', 'manager')
  @Get('dishes')
  listDishes(@Query() query: DishQueryDto) {
    return this.dishService.listForAdmin(query)
  }

  @Roles('admin', 'manager')
  @Post('dishes')
  createDish(@Body() dto: CreateDishDto) {
    return this.dishService.create(dto)
  }

  @Roles('admin', 'manager')
  @Put('dishes/:id')
  updateDish(@Param('id') id: string, @Body() dto: UpdateDishDto) {
    return this.dishService.update(id, dto)
  }

  /** 整组替换菜品规格（大份/小份、辣度等），提交即全量覆盖 */
  @Roles('admin', 'manager')
  @Put('dishes/:id/specs')
  updateDishSpecs(@Param('id') id: string, @Body() dto: UpdateDishSpecsDto) {
    return this.dishService.replaceSpecs(id, dto)
  }

  @Roles('admin', 'manager')
  @Delete('dishes/:id')
  removeDish(@Param('id') id: string) {
    return this.dishService.remove(id)
  }

  // ---------------- 分类 ----------------

  @Roles('admin', 'manager')
  @Get('categories')
  listCategories() {
    return this.categoryService.list()
  }

  @Roles('admin', 'manager')
  @Post('categories')
  createCategory(@Body() dto: CategoryPayloadDto) {
    return this.categoryService.create(dto)
  }

  @Roles('admin', 'manager')
  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: Partial<CategoryPayloadDto>) {
    return this.categoryService.update(id, dto)
  }

  @Roles('admin', 'manager')
  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.categoryService.remove(id)
  }
}
