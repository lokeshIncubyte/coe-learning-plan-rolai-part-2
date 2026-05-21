import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminStatsService } from './admin-stats.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminStatsService],
  exports: [AdminStatsService],
})
export class AdminModule {}
