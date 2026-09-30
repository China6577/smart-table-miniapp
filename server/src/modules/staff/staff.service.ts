import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import bcrypt from 'bcryptjs'
import { BusinessException } from '../../common/business.exception'
import { StaffEntity } from '../../database/entities/staff.entity'
import { toStaffDto } from '../../common/mappers'
import { genId } from '../../utils/ids'
import type { CreateStaffDto, UpdateStaffDto } from './staff.dto'

/** 员工管理：账号唯一、角色校验、自我保护（不能禁用/降级/删除自己） */
@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
  ) {}

  /** 全部员工（含禁用），按创建时间升序 */
  async list() {
    const all = await this.staffRepo.find()
    return all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(toStaffDto)
  }

  async create(dto: CreateStaffDto) {
    const username = dto.username.trim()
    const exists = await this.staffRepo.findOne({ where: { username } })
    if (exists) throw new BusinessException(422, '用户名已存在')

    const staff = this.staffRepo.create({
      id: genId('s'),
      username,
      name: dto.name.trim(),
      role: dto.role,
      passwordHash: await bcrypt.hash(dto.password ?? '123456', 10),
      status: dto.status ?? 1,
    })
    await this.staffRepo.save(staff)
    return toStaffDto(staff)
  }

  async update(id: string, dto: UpdateStaffDto, currentStaffId: string) {
    const staff = await this.staffRepo.findOne({ where: { id } })
    if (!staff) throw new BusinessException(404, '员工不存在')

    if (dto.name !== undefined) {
      const name = dto.name.trim()
      if (!name) throw new BusinessException(422, '姓名不能为空')
      staff.name = name
    }
    if (dto.role !== undefined) {
      // 最后一个管理员不允许降级，避免后台失去管理入口
      if (id === currentStaffId && dto.role !== 'admin') throw new BusinessException(422, '不能降级自己的店长角色')
      if (staff.role === 'admin' && dto.role !== 'admin') {
        const adminCount = await this.staffRepo.count({ where: { role: 'admin', status: 1 } })
        if (adminCount <= 1) throw new BusinessException(422, '系统至少保留一名管理员')
      }
      staff.role = dto.role
    }
    if (dto.password !== undefined) staff.passwordHash = await bcrypt.hash(dto.password, 10)
    if (dto.status !== undefined) {
      if (id === currentStaffId && dto.status === 0) throw new BusinessException(422, '不能禁用自己的账号')
      staff.status = dto.status
    }

    await this.staffRepo.save(staff)
    return toStaffDto(staff)
  }

  async remove(id: string, currentStaffId: string): Promise<boolean> {
    if (id === currentStaffId) throw new BusinessException(422, '不能删除自己的账号')

    const staff = await this.staffRepo.findOne({ where: { id } })
    if (!staff) throw new BusinessException(404, '员工不存在')

    await this.staffRepo.delete(id)
    return true
  }
}
