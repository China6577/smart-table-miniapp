import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common'
import { BusinessException } from './business.exception'

/** 统一异常出口：业务错误走响应包 code，协议错误走 HTTP 状态码 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>()

    if (exception instanceof BusinessException) {
      response.status(200).json({ code: exception.bizCode, message: exception.message, data: null })
      return
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()
      // class-validator 的校验错误 message 是数组，拼接为可读文本
      const message =
        typeof body === 'string'
          ? body
          : Array.isArray((body as { message?: unknown }).message)
            ? ((body as { message: string[] }).message ?? []).join('；')
            : String((body as { message?: unknown }).message ?? '请求参数错误')
      response.status(status).json({ code: status, message, data: null })
      return
    }

    // 未知异常：完整堆栈进日志，对外只暴露通用提示
    // eslint-disable-next-line no-console
    console.error('[smart-table] 未处理异常:', exception)
    response.status(500).json({ code: 500, message: '服务器内部错误，请稍后重试', data: null })
  }
}
