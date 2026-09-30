import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StaffEntity } from '../../database/entities'
import { StaffController } from './staff.controller'
import { StaffService } from './staff.service'

@Module({
  imports: [TypeOrmModule.forFeature([StaffEntity])],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
