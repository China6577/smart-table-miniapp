import { Injectable, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'
import { appConfig } from '../../config'

/**
 * Redis 连接（订单号序列）。
 * 连接失败或未配置时静默降级为进程内计数，不阻塞下单主流程。
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis | null = null
  private readonly available: boolean

  constructor() {
    if (!appConfig.redisUrl) {
      this.available = false
      return
    }
    try {
      this.client = new Redis(appConfig.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        // 重试 3 次后放弃并进入降级模式，避免不断打日志
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
      })
      this.client.on('error', () => {
        // 连接异常交由调用方 try/catch 降级
      })
      void this.client.connect()
      this.available = true
    } catch {
      this.available = false
    }
  }

  isEnabled(): boolean {
    return this.available && this.client !== null
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null
    try {
      return await this.client.get(key)
    } catch {
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.client) return
    try {
      await this.client.set(key, value)
    } catch {
      // 降级：忽略
    }
  }

  /** 自增并返回新值；不可用时返回 null */
  async incr(key: string): Promise<number | null> {
    if (!this.client) return null
    try {
      return await this.client.incr(key)
    } catch {
      return null
    }
  }

  /** 演示数据重置时清空序列缓存 */
  async resetSequences(): Promise<void> {
    if (!this.client) return
    try {
      await this.client.flushall()
    } catch {
      // 降级：忽略
    }
  }

  onModuleDestroy(): void {
    void this.client?.quit()
  }
}
