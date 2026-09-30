import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { StaffEntity } from '../../database/entities/staff.entity'

@Module({
  imports: [TypeOrmModule.forFeature([StaffEntity])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
