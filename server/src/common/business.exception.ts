import { HttpException } from '@nestjs/common'

/**
 * 业务异常：HTTP 层面返回 200，错误信息通过响应包 code 传递。
 * 这是与前端 request 封装的约定 —— 前端依据 body.code !== 0 抛出并展示 message。
 */
export class BusinessException extends HttpException {
  readonly bizCode: number

  constructor(bizCode: number, message: string) {
    super(message, 200)
    this.bizCode = bizCode
  }
}
