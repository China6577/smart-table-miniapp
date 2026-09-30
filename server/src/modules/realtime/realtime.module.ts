import { Module } from '@nestjs/common'
import { RealtimeGateway } from './realtime.gateway'
import { RealtimeService } from './realtime.service'

/** 实时推送模块：JwtModule 已在 AppModule 全局注册，此处无需重复导入 */
@Module({
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
