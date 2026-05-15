import { GenerationHistoryService } from './generation-history.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  generationHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
} as unknown as PrismaService;

describe('GenerationHistoryService', () => {
  let service: GenerationHistoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GenerationHistoryService(mockPrisma);
  });

  describe('saveGeneration', () => {
    it('calls generationHistory.create with all four fields and returns the created record', async () => {
      const created = {
        id: 'h1',
        sessionId: 's1',
        narrative: 'Once upon a time...',
        anchor: 'beat-1',
        deltas: [],
      };
      (mockPrisma.generationHistory.create as jest.Mock).mockResolvedValueOnce(created);

      const result = await service.saveGeneration('s1', 'Once upon a time...', 'beat-1', []);

      expect(mockPrisma.generationHistory.create).toHaveBeenCalledWith({
        data: {
          sessionId: 's1',
          narrative: 'Once upon a time...',
          anchor: 'beat-1',
          deltas: [],
        },
      });
      expect(result).toEqual(created);
    });
  });

  describe('getHistoryBySession', () => {
    it('calls findMany with correct where, skip, take, and orderBy params and returns results', async () => {
      const records = [{ id: 'h2', sessionId: 's1', narrative: 'Later...' }];
      (mockPrisma.generationHistory.findMany as jest.Mock).mockResolvedValueOnce(records);

      const result = await service.getHistoryBySession('s1', 2, 5);

      expect(mockPrisma.generationHistory.findMany).toHaveBeenCalledWith({
        where: { sessionId: 's1' },
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(records);
    });

    it('skips 0 records when page is 1', async () => {
      (mockPrisma.generationHistory.findMany as jest.Mock).mockResolvedValueOnce([]);

      await service.getHistoryBySession('s1', 1, 10);

      expect(mockPrisma.generationHistory.findMany).toHaveBeenCalledWith({
        where: { sessionId: 's1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
