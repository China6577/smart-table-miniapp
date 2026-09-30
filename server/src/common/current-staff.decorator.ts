import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/** 请求上下文中的登录员工（由 JwtAuthGuard 注入） */
export interface RequestStaff {
  id: string
  username: string
  name: string
  role: string
}

/** 取当前登录员工：@CurrentStaff() staff */
export const CurrentStaff = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestStaff => {
  return ctx.switchToHttp().getRequest<{ staff: RequestStaff }>().staff
})
