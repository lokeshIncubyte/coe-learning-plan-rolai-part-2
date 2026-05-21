import { Test, TestingModule } from '@nestjs/testing'
import { AdminController } from './admin.controller'
import { AdminStatsService } from './admin-stats.service'

describe('AdminController routing smoke', () => {
  it('getStats delegates to adminStatsService.getStats and returns result', async () => {
    const statsResult = { entityCount: 10, edgeCount: 5, sessionCount: 2, historyCount: 20, latestHistoryAt: new Date() }
    const getStats = jest.fn().mockResolvedValue(statsResult)
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminStatsService, useValue: { getStats } }],
    }).compile()
    const controller = module.get(AdminController)
    const result = await controller.getStats()
    expect(getStats).toHaveBeenCalledTimes(1)
    expect(result).toEqual(statsResult)
  })
})
