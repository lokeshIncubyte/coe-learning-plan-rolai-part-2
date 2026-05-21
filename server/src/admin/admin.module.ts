import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminStatsService } from './admin-stats.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminStatsService],
  exports: [AdminStatsService],
})
export class AdminModule {}
