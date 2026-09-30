import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { BusinessException } from './business.exception'
import { ROLES_KEY } from './roles.decorator'
import type { RequestStaff } from './current-staff.decorator'

/** RBAC 守卫：@Roles(...) 声明的接口要求当前员工具备其一角色 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()])
    if (!required?.length) return true

    const { staff } = context.switchToHttp().getRequest<{ staff?: RequestStaff }>()
    if (!staff || !required.includes(staff.role)) {
      throw new BusinessException(403, '没有该操作的权限')
    }
    return true
  }
}
