import { SetMetadata } from '@nestjs/common'

/** 接口所需角色列表：@Roles('admin', 'manager') */
export const ROLES_KEY = 'roles'
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
