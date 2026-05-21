import { Controller, Get } from '@nestjs/common'
import { AdminStatsService } from './admin-stats.service'

@Controller('admin')
export class AdminController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get('stats')
  async getStats() {
    return this.adminStatsService.getStats()
  }
}
