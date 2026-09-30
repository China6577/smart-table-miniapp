import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DiningTableEntity } from '../../database/entities'
import { TableController } from './table.controller'
import { TableService } from './table.service'

@Module({
  imports: [TypeOrmModule.forFeature([DiningTableEntity])],
  controllers: [TableController],
  providers: [TableService],
  exports: [TableService],
})
export class TableModule {}
