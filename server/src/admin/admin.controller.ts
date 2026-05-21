import { Controller, Get, UseGuards } from '@nestjs/common'
import { AdminStatsService } from './admin-stats.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@Controller('admin')
export class AdminController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getStats() {
    return this.adminStatsService.getStats()
  }
}
