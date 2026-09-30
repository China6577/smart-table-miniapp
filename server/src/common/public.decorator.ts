import { SetMetadata } from '@nestjs/common'

/** 标记无需登录的接口（顾客端 / 登录） */
export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
