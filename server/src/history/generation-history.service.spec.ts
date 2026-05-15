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
});
