import 'reflect-metadata'
import { join } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { WsAdapter } from '@nestjs/platform-ws'
import { AppModule } from './app.module'
import { TransformInterceptor } from './common/api-response.interceptor'
import { AllExceptionsFilter } from './common/all-exceptions.filter'
import { appConfig, validateProductionConfig } from './config'

async function bootstrap(): Promise<void> {
  // 生产配置 fail fast：不合法直接终止启动，避免带伤上线
  validateProductionConfig()

  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // 静态资源：菜品演示图片（/api/static/dishes/* -> server/public/dishes/*）
  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/api/static' })

  // WebSocket 适配器（原生 ws）：实时订单推送走 /api/ws，与 HTTP 同端口
  app.useWebSocketAdapter(new WsAdapter(app))

  // 全局路由前缀：/api/customer/* 与 /api/admin/*
  app.setGlobalPrefix('api')

  // 统一响应包裹 { code: 0, data, message }
  app.useGlobalInterceptors(new TransformInterceptor())
  // 统一异常出口 { code, message, data: null }
  app.useGlobalFilters(new AllExceptionsFilter())
  // 入参校验（DTO 白名单 + 类型转换）
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  )

  // 跨域：配置了 CORS_ORIGINS 则收敛白名单，否则开放（本地联调）
  app.enableCors({
    origin: appConfig.corsOrigins.length > 0 ? appConfig.corsOrigins : true,
    credentials: true,
  })

  await app.listen(appConfig.port)
  // eslint-disable-next-line no-console
  console.log(`[smart-table] API 服务已启动: http://localhost:${appConfig.port}/api`)
}

void bootstrap()
