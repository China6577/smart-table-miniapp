import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as QRCode from 'qrcode'
import { BusinessException } from '../../common/business.exception'
import { DiningTableEntity } from '../../database/entities/dining-table.entity'
import { toTableDto } from '../../common/mappers'
import { appConfig } from '../../config'
import { genId } from '../../utils/ids'
import type { TablePayloadDto, UpdateTableDto } from './table.dto'

/** 桌号管理：编码规范校验、唯一性校验、桌码二维码生成 */
@Injectable()
export class TableService {
  constructor(
    @InjectRepository(DiningTableEntity)
    private readonly tableRepo: Repository<DiningTableEntity>,
  ) {}

  /** 全部餐桌（含停用），按桌号编码排序 */
  async list(): Promise<Array<{ id: string; code: string; area: string; capacity: number; status: 0 | 1; qrCodeUrl?: string }>> {
    const all = await this.tableRepo.find()
    return all
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((table) => ({ ...toTableDto(table), qrCodeUrl: table.qrCodeUrl ?? undefined }))
  }

  async create(dto: TablePayloadDto) {
    const code = dto.code.trim().toUpperCase()
    const exists = await this.tableRepo.findOne({ where: { code } })
    if (exists) throw new BusinessException(422, '桌号已存在')

    const table = this.tableRepo.create({
      id: genId('t'),
      code,
      area: dto.area?.trim() || '大厅',
      capacity: dto.capacity ?? 4,
      status: dto.status ?? 1,
    })
    await this.tableRepo.save(table)
    return toTableDto(table)
  }

  async update(id: string, dto: UpdateTableDto) {
    const table = await this.tableRepo.findOne({ where: { id } })
    if (!table) throw new BusinessException(404, '餐桌不存在')

    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase()
      const conflict = await this.tableRepo.findOne({ where: { code } })
      if (conflict && conflict.id !== id) throw new BusinessException(422, '桌号已存在')
      table.code = code
    }
    if (dto.area !== undefined) table.area = dto.area.trim() || '大厅'
    if (dto.capacity !== undefined) table.capacity = dto.capacity
    if (dto.status !== undefined) table.status = dto.status

    await this.tableRepo.save(table)
    return toTableDto(table)
  }

  async remove(id: string): Promise<boolean> {
    const table = await this.tableRepo.findOne({ where: { id } })
    if (!table) throw new BusinessException(404, '餐桌不存在')
    await this.tableRepo.delete(id)
    return true
  }

  /**
   * 生成桌码二维码并落库（设计文档 6.3）：
   * 演示环境直接产出 data URL 存 qr_code_url；生产环境改为上传 OSS 后回写外链。
   */
  async generateQrCode(id: string) {
    const table = await this.tableRepo.findOne({ where: { id } })
    if (!table) throw new BusinessException(404, '餐桌不存在')

    const content = appConfig.qrContentTemplate.replace('{code}', table.code)
    const dataUrl = await QRCode.toDataURL(content, { width: 480, margin: 1 })
    table.qrCodeUrl = dataUrl
    await this.tableRepo.save(table)
    return { ...toTableDto(table), qrCodeUrl: dataUrl }
  }

  /** 顾客端：按桌号编码查询启用中的餐桌 */
  async findByCode(code: string): Promise<DiningTableEntity | null> {
    return this.tableRepo.findOne({ where: { code, status: 1 } })
  }
}
