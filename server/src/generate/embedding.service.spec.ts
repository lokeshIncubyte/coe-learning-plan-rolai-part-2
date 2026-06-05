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
        name: 'Mira', type: 'character', archetype: 'Mage',
        backstory: 'An ancient sorcerer', role: 'protagonist',
      });
      expect(result).toBe('Mira | character | Mage | An ancient sorcerer | protagonist');
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
        name: 'Mira', type: 'character', archetype: 'Mage',
        backstory: null, role: null,
      });
      expect(result).not.toContain('health');
      expect(result).not.toContain('gold');
    });
  });

  describe('embedEntityIdentity', () => {
    it('reads the entity, builds identity text, generates embedding, and writes via $executeRawUnsafe', async () => {
      const entity = {
        id: 'e1', name: 'Mira', type: 'character',
        archetype: 'Mage', backstory: null, role: null,
      };
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(entity);
      (mockPrisma.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(1);
      jest.spyOn(service, 'generateEmbedding').mockResolvedValueOnce(new Array(384).fill(0.1));

      await service.embedEntityIdentity('e1');

      expect(mockPrisma.entity.findUnique).toHaveBeenCalledWith({ where: { id: 'e1' } });
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('skips and does not throw when entity is not found', async () => {
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.embedEntityIdentity('missing')).resolves.toBeUndefined();
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
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

    it('returns a zero-vector when the proxy throws', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        embeddings: {
          create: jest.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')),
        },
      }));
      const svc = new EmbeddingService(mockPrisma, mockConfig);
      const result = await svc.generateEmbedding('any text');
      expect(result).toHaveLength(384);
      expect(result.every((v: number) => v === 0)).toBe(true);
    });
  });

  describe('onEntityWrite', () => {
    it('re-embeds and increments identity_version when an identity field changes', async () => {
      const before = { id: 'e1', name: 'Mira', type: 'character', archetype: 'Mage', backstory: null, role: null, state: {} };
      const after  = { id: 'e1', name: 'Mira', type: 'character', archetype: 'Warrior', backstory: null, role: null, state: {} };

      (mockPrisma.entity.update as jest.Mock).mockResolvedValueOnce({ ...after, identity_version: 1 });
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(after);
      (mockPrisma.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(1);
      jest.spyOn(service, 'generateEmbedding').mockResolvedValueOnce(new Array(384).fill(0.1));

      await service.onEntityWrite(before, after);

      expect(mockPrisma.entity.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { identity_version: { increment: 1 } },
      });
    });

    it('does NOT re-embed when only state changes', async () => {
      const before = { id: 'e1', name: 'Mira', type: 'character', archetype: 'Mage', backstory: null, role: null, state: { health: 100 } };
      const after  = { ...before, state: { health: 50 } };

      await service.onEntityWrite(before, after);

      expect(mockPrisma.entity.update).not.toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe('shouldReembed', () => {
    const base = {
      id: 'e1', name: 'Mira', type: 'character',
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
