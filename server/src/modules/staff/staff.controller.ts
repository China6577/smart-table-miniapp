import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { Roles } from '../../common/roles.decorator'
import { CurrentStaff } from '../../common/current-staff.decorator'
import { StaffService } from './staff.service'
import { CreateStaffDto, UpdateStaffDto } from './staff.dto'

/** 商家端员工管理（仅店长可操作，契约见 docs/01-系统设计.md 6.3 节） */
@Roles('admin')
@Controller('admin/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  list() {
    return this.staffService.list()
  }

  @Post()
  create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto, @CurrentStaff() staff: { id: string }) {
    return this.staffService.update(id, dto, staff.id)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentStaff() staff: { id: string }) {
    return this.staffService.remove(id, staff.id)
  }
}
