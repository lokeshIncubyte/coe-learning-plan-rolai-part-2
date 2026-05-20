import { EmbeddingService } from './embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    embeddings: { create: jest.fn() },
  })),
}));

const mockPrisma = {
  entity: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  $executeRaw: jest.fn(),
  $executeRawUnsafe: jest.fn(),
} as unknown as PrismaService;

const mockConfig = {
  get: jest.fn().mockReturnValue('http://localhost:4000'),
} as unknown as ConfigService;

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmbeddingService(mockPrisma, mockConfig);
  });

  describe('buildIdentityText', () => {
    it('joins name, type, archetype, backstory, role with pipe separator', () => {
      const result = service.buildIdentityText({
        name: 'Elara', type: 'character', archetype: 'Mage',
        backstory: 'An ancient sorcerer', role: 'protagonist',
      });
      expect(result).toBe('Elara | character | Mage | An ancient sorcerer | protagonist');
    });

    it('omits null and undefined identity fields', () => {
      const result = service.buildIdentityText({
        name: 'Stone', type: 'object', archetype: null,
        backstory: undefined, role: null,
      });
      expect(result).toBe('Stone | object');
    });

    it('does NOT include state or facts in the identity text', () => {
      const result = service.buildIdentityText({
        name: 'Elara', type: 'character', archetype: 'Mage',
        backstory: null, role: null,
      });
      expect(result).not.toContain('health');
      expect(result).not.toContain('gold');
    });
  });
});
