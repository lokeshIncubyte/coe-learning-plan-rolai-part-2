import { AdminStatsService } from './admin-stats.service'

describe('AdminStatsService', () => {
  it('getStats returns counts from prisma', async () => {
    const latestDate = new Date('2026-05-21')
    const mockPrisma = {
      entity: { count: jest.fn().mockResolvedValue(42) },
      edge: { count: jest.fn().mockResolvedValue(15) },
      session: { count: jest.fn().mockResolvedValue(3) },
      generationHistory: {
        count: jest.fn().mockResolvedValue(271),
        findFirst: jest.fn().mockResolvedValue({ createdAt: latestDate }),
      },
    }
    const service = new AdminStatsService(mockPrisma as any)
    const stats = await service.getStats()
    expect(stats).toEqual({
      entityCount: 42,
      edgeCount: 15,
      sessionCount: 3,
      historyCount: 271,
      latestHistoryAt: latestDate,
    })
  })
})
