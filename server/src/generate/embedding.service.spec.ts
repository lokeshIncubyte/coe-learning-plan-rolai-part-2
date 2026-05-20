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

  describe('generateEmbedding', () => {
    it('calls openai embeddings.create and returns the embedding array', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        embeddings: {
          create: jest.fn().mockResolvedValueOnce({
            data: [{ embedding: Array.from({ length: 384 }, () => 0.5) }],
          }),
        },
      }));
      const svc = new EmbeddingService(mockPrisma, mockConfig);
      const result = await svc.generateEmbedding('test text');
      expect(result).toHaveLength(384);
      expect(typeof result[0]).toBe('number');
    });
  });

  describe('shouldReembed', () => {
    const base = {
      id: 'e1', name: 'Elara', type: 'character',
      archetype: 'Mage', backstory: 'Ancient sorcerer', role: 'protagonist',
      state: { health: 100 }, facts: { hometown: 'Ashwood' },
    };

    it('returns false when only state changes', () => {
      expect(service.shouldReembed(
        { ...base, state: { health: 100 } },
        { ...base, state: { health: 50, status: 'wounded' } },
      )).toBe(false);
    });

    it('returns false when only facts change', () => {
      expect(service.shouldReembed(
        { ...base, facts: { hometown: 'Ashwood' } },
        { ...base, facts: { hometown: 'Ashwood', guild: 'Mages' } },
      )).toBe(false);
    });

    it('returns true when archetype changes', () => {
      expect(service.shouldReembed(base, { ...base, archetype: 'Warrior' })).toBe(true);
    });

    it('returns true when role changes', () => {
      expect(service.shouldReembed(base, { ...base, role: 'antagonist' })).toBe(true);
    });

    it('returns true when name changes', () => {
      expect(service.shouldReembed(base, { ...base, name: 'Elena' })).toBe(true);
    });
  });
});
