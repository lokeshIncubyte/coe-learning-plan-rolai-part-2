import { HistoryService } from './history.service'

describe('HistoryService', () => {
  it('logEntry calls prisma.generationHistory.create with correct fields', async () => {
    const mockPrisma = {
      generationHistory: { create: jest.fn().mockResolvedValue({ id: 'hist-1' }) },
    }
    const service = new HistoryService(mockPrisma as any)
    await service.logEntry('sess-1', 'A dragon appears.', 'entity-42', [])
    expect(mockPrisma.generationHistory.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'sess-1',
        narrative: 'A dragon appears.',
        anchor: 'entity-42',
        deltas: [],
      },
    })
  })
})
