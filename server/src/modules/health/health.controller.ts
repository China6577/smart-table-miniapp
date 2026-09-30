import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { Public } from '../../common/public.decorator'

/**
 * 健康检查（@Public 无需登录）：
 * 供负载均衡 / 容器编排探活，数据库不可达时返回 503。
 */
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @Public()
  async check() {
    let dbOk = false
    try {
      await this.dataSource.query('SELECT 1')
      dbOk = true
    } catch {
      dbOk = false
    }
    if (!dbOk) throw new ServiceUnavailableException('数据库不可达')
    return {
      status: 'ok',
      db: true,
      uptime: Math.round(process.uptime()),
      timestamp: Date.now(),
    }
  }
}
