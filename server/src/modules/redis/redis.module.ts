import { Global, Module } from '@nestjs/common'
import { RedisService } from './redis.service'

/** 全局 Redis 模块（订单号序列） */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
