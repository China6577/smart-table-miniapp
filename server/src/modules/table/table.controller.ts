import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { Roles } from '../../common/roles.decorator'
import { TableService } from './table.service'
import { TablePayloadDto, UpdateTableDto } from './table.dto'

/** 商家端桌号管理（契约见 docs/01-系统设计.md 6.3 节） */
@Roles('admin', 'manager')
@Controller('admin/tables')
export class TableController {
  constructor(private readonly tableService: TableService) {}

  @Get()
  list() {
    return this.tableService.list()
  }

  @Post()
  create(@Body() dto: TablePayloadDto) {
    return this.tableService.create(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tableService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tableService.remove(id)
  }

  /** 生成桌码二维码（演示：data URL；生产：OSS 外链） */
  @Post(':id/qrcode')
  qrcode(@Param('id') id: string) {
    return this.tableService.generateQrCode(id)
  }
}
