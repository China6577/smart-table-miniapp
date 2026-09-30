import { Module } from '@nestjs/common'
import { DevController } from './dev.controller'
import { OrderModule } from '../order/order.module'
import { SeedModule } from '../seed/seed.module'

@Module({
  imports: [OrderModule, SeedModule],
  controllers: [DevController],
})
export class DevModule {}
