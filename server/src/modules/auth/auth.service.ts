import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcryptjs'
import { BusinessException } from '../../common/business.exception'
import { StaffEntity } from '../../database/entities/staff.entity'
import type { LoginDto } from './auth.dto'

export interface AuthUserDto {
  id: string
  username: string
  name: string
  role: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string; user: AuthUserDto }> {
    const staff = await this.staffRepo.findOne({ where: { username: dto.username.trim() } })
    if (!staff) throw new BusinessException(422, '用户名或密码错误')

    const ok = await bcrypt.compare(dto.password, staff.passwordHash)
    if (!ok) throw new BusinessException(422, '用户名或密码错误')

    if (staff.status !== 1) throw new BusinessException(422, '账号已被禁用')

    const token = this.jwtService.sign({
      sub: staff.id,
      username: staff.username,
      name: staff.name,
      role: staff.role,
    })
    return { token, user: this.toAuthUser(staff) }
  }

  /** 校验账号仍有效（JWT 有效但账号被禁用时拒绝） */
  async getUserById(id: string): Promise<AuthUserDto> {
    const staff = await this.staffRepo.findOne({ where: { id } })
    if (!staff || staff.status !== 1) throw new BusinessException(401, '账号不存在或已禁用')
    return this.toAuthUser(staff)
  }

  private toAuthUser(staff: StaffEntity): AuthUserDto {
    return { id: staff.id, username: staff.username, name: staff.name, role: staff.role }
  }
}
