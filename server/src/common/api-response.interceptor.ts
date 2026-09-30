import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable, map } from 'rxjs'

/** 统一成功响应包裹：{ code: 0, data, message: 'ok' } */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { code: number; data: T; message: string }> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<{ code: number; data: T; message: string }> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        // DELETE 等接口可能返回 undefined，统一落为 null 保证结构稳定
        data: (data === undefined ? null : data) as T,
      })),
    )
  }
}
