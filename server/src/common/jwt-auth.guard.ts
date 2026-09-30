import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { BusinessException } from './business.exception'
import { IS_PUBLIC_KEY } from './public.decorator'
import type { RequestStaff } from './current-staff.decorator'

/**
 * 全局 JWT 守卫：
 * - @Public() 标记的接口直接放行（顾客端、登录）
 * - 其余接口解析 Bearer Token，校验通过后把员工信息挂到 request.staff
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; staff?: RequestStaff }>()
    const authorization = request.headers['authorization'] ?? ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
    if (!token) throw new BusinessException(401, '未登录或登录已过期')

    let payload: { sub?: string; username?: string; name?: string; role?: string }
    try {
      payload = this.jwtService.verify<{ sub: string; username: string; name: string; role: string }>(token)
    } catch {
      throw new BusinessException(401, '登录已过期，请重新登录')
    }
    if (!payload?.sub || !payload?.role) throw new BusinessException(401, '登录信息无效')

    request.staff = { id: payload.sub, username: payload.username ?? '', name: payload.name ?? '', role: payload.role }
    return true
  }
}
