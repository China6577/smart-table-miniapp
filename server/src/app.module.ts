import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { appConfig } from './config'
import { entities } from './database/entities'
import { JwtAuthGuard } from './common/jwt-auth.guard'
import { RolesGuard } from './common/roles.guard'
import { RedisModule } from './modules/redis/redis.module'
import { AuthModule } from './modules/auth/auth.module'
import { CustomerModule } from './modules/customer/customer.module'
import { MenuModule } from './modules/menu/menu.module'
import { TableModule } from './modules/table/table.module'
import { StaffModule } from './modules/staff/staff.module'
import { OrderModule } from './modules/order/order.module'
import { RealtimeModule } from './modules/realtime/realtime.module'
import { StatsModule } from './modules/stats/stats.module'
import { SeedModule } from './modules/seed/seed.module'
import { DevModule } from './modules/dev/dev.module'
import { HealthModule } from './modules/health/health.module'

@Module({
  imports: [
    // JWT 全局可用（守卫签发校验共用同一密钥）
    JwtModule.register({
      global: true,
      secret: appConfig.jwtSecret,
      signOptions: { expiresIn: appConfig.jwtExpiresIn },
    }),
    // PostgreSQL（开发期 synchronize 自动建表；生产切换为迁移脚本）
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres' as const,
        url: appConfig.databaseUrl,
        entities,
        synchronize: true,
        // 连接池：演示环境小规模即可
        extra: { max: 10 },
      }),
    }),
    RedisModule,
    AuthModule,
    CustomerModule,
    MenuModule,
    TableModule,
    StaffModule,
    OrderModule,
    RealtimeModule,
    StatsModule,
    SeedModule,
    DevModule,
    HealthModule,
  ],
  providers: [
    // 全局守卫顺序：先鉴权（注入 request.staff），再 RBAC
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
