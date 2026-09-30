import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RedisService } from '../redis/redis.service'
import { OrderEntity } from '../../database/entities'

/**
 * 订单号生成：YYYYMMDD + 4 位当日流水（如 202608260001）。
 * 生产：Redis INCR 保证多实例全局唯一；Redis 不可用时退化为进程内计数（单实例场景）。
 * 当日首次调用会先扫描 DB 已有最大流水，避免与种子/历史订单撞号（唯一索引兜底）。
 */
@Injectable()
export class OrderNoService {
  private date = ''
  private seq = 0

  constructor(
    private readonly redis: RedisService,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  async next(): Promise<string> {
    const date = todayStr()
    if (this.date !== date) {
      this.date = date
      this.seq = 0
    }

    if (this.redis.isEnabled()) {
      const key = `st:order:seq:${date}`
      if (this.seq === 0) {
        // 当日首次：以 DB 最大流水为基线校准 Redis 序列
        const base = await this.dbMaxSeq(date)
        const cached = Number((await this.redis.get(key)) ?? 0)
        if (cached < base) await this.redis.set(key, String(base))
        this.seq = base
      }
      const n = await this.redis.incr(key)
      if (n !== null && n > this.seq) {
        this.seq = n
        return `${date}${String(n).padStart(4, '0')}`
      }
      // Redis 异常时落到进程内计数
    }

    this.seq += 1
    return `${date}${String(this.seq).padStart(4, '0')}`
  }

  /** 演示数据重置后重置当日基线 */
  resetBaseline(): void {
    this.date = ''
    this.seq = 0
  }

  private async dbMaxSeq(date: string): Promise<number> {
    const row = await this.orderRepo
      .createQueryBuilder('o')
      .select('MAX(o.orderNo)', 'max')
      .where('o.orderNo LIKE :prefix', { prefix: `${date}%` })
      .getRawOne<{ max: string | null }>()
    const max = row?.max
    return max ? Number(max.slice(date.length)) || 0 : 0
  }
}

function todayStr(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}${mm}${dd}`
}
