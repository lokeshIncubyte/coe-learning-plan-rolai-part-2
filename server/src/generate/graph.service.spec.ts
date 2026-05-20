import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GraphService } from './graph.service';
import { EmbeddingService } from './embedding.service';
import { PrismaService } from '../prisma/prisma.service';

const mockEmbeddingService = {
  generateEmbedding: jest.fn().mockResolvedValue(Array.from({ length: 384 }, () => 0.1)),
  onEntityWrite: jest.fn().mockResolvedValue(undefined),
} as unknown as EmbeddingService;

const mockPrisma = {
  entity: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  edge: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRawUnsafe: jest.fn(),
} as unknown as PrismaService;

describe('GraphService', () => {
  let service: GraphService;

  beforeEach(() => {
    jest.resetAllMocks();
    (mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(
      Array.from({ length: 384 }, () => 0.1),
    );
    (mockEmbeddingService.onEntityWrite as jest.Mock).mockResolvedValue(undefined);
    service = new GraphService(mockPrisma, mockEmbeddingService);
  });
  // describe blocks added per cycle below

  describe('updateEdgeWeight', () => {
    it('calls prisma.edge.update with the new weight and returns the result', async () => {
      const updated = { id: 'edge1', fromId: 'e1', toId: 'e2', type: 'knows', weight: 0.5 };
      (mockPrisma.edge.update as jest.Mock).mockResolvedValueOnce(updated);

      const result = await service.updateEdgeWeight('edge1', 0.5);

      expect(mockPrisma.edge.update).toHaveBeenCalledWith({
        where: { id: 'edge1' },
        data: { weight: 0.5 },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('updateEntityState', () => {
    it('reads current state, merges patch, and writes merged state inside a transaction', async () => {
      const existingEntity = { id: 'e1', state: { health: 100 } };
      const updatedEntity = { id: 'e1', state: { health: 80, status: 'wounded' } };

      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(existingEntity);
      (mockPrisma.entity.update as jest.Mock).mockResolvedValueOnce(updatedEntity);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
      );

      const result = await service.updateEntityState('e1', { health: 80, status: 'wounded' });

      expect(mockPrisma.entity.findUnique).toHaveBeenCalledWith({ where: { id: 'e1' } });
      expect(mockPrisma.entity.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { state: { health: 80, status: 'wounded' } },
      });
      expect(result).toEqual(updatedEntity);
    });

    it('calls onEntityWrite after state update so the re-embed hook can check for identity shift', async () => {
      const before = { id: 'e1', state: { health: 100 }, name: 'Elara', type: 'character', archetype: 'Mage', backstory: null, role: null };
      const after  = { id: 'e1', state: { health: 50 },  name: 'Elara', type: 'character', archetype: 'Mage', backstory: null, role: null };
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(before);
      (mockPrisma.entity.update as jest.Mock).mockResolvedValueOnce(after);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
      );

      await service.updateEntityState('e1', { health: 50 });

      expect(mockEmbeddingService.onEntityWrite).toHaveBeenCalledWith(before, after);
    });
  });

  describe('createEdge', () => {
    it('calls prisma.edge.create with data and returns the created edge', async () => {
      const created = { id: 'edge1', fromId: 'e1', toId: 'e2', type: 'knows', weight: 1.0, tags: [] };
      (mockPrisma.edge.create as jest.Mock).mockResolvedValueOnce(created);

      const result = await service.createEdge({ fromId: 'e1', toId: 'e2', type: 'knows', tags: [] });

      expect(mockPrisma.edge.create).toHaveBeenCalledWith({
        data: { fromId: 'e1', toId: 'e2', type: 'knows', tags: [] },
      });
      expect(result).toEqual(created);
    });
  });

  describe('getEntitiesByTag', () => {
    it('calls findMany with the tags.has filter and returns results', async () => {
      const entities = [{ id: 'e2', type: 'location', name: 'Cave', tags: ['dangerous'] }];
      (mockPrisma.entity.findMany as jest.Mock).mockResolvedValueOnce(entities);

      const result = await service.getEntitiesByTag('dangerous');

      expect(mockPrisma.entity.findMany).toHaveBeenCalledWith({
        where: { tags: { has: 'dangerous' } },
      });
      expect(result).toEqual(entities);
    });
  });

  describe('getEntitiesByType', () => {
    it('calls findMany with the type filter and returns results', async () => {
      const entities = [{ id: 'e1', type: 'location', name: 'Forest' }];
      (mockPrisma.entity.findMany as jest.Mock).mockResolvedValueOnce(entities);

      const result = await service.getEntitiesByType('location');

      expect(mockPrisma.entity.findMany).toHaveBeenCalledWith({ where: { type: 'location' } });
      expect(result).toEqual(entities);
    });
  });

  describe('getEntityById', () => {
    it('returns the entity when found', async () => {
      const entity = { id: 'e1', type: 'character', name: 'Elara' };
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(entity);

      const result = await service.getEntityById('e1');

      expect(mockPrisma.entity.findUnique).toHaveBeenCalledWith({ where: { id: 'e1' } });
      expect(result).toEqual(entity);
    });

    it('throws NotFoundException when entity not found', async () => {
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.getEntityById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createEntity', () => {
    it('calls prisma.entity.create with data and returns the result', async () => {
      const created = { id: 'e1', type: 'character', name: 'Elara', tags: [], facts: {}, state: {} };
      (mockPrisma.entity.create as jest.Mock).mockResolvedValueOnce(created);

      const result = await service.createEntity({ type: 'character', name: 'Elara', tags: [] });

      expect(mockPrisma.entity.create).toHaveBeenCalledWith({
        data: { type: 'character', name: 'Elara', tags: [] },
      });
      expect(result).toEqual(created);
    });
  });

  describe('updateEntityIdentity', () => {
    it('updates identity fields and calls onEntityWrite hook', async () => {
      const before = { id: 'e1', name: 'Elara', type: 'character', archetype: 'Mage', backstory: null, role: null };
      const after  = { ...before, archetype: 'Warrior' };
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(before);
      (mockPrisma.entity.update as jest.Mock).mockResolvedValueOnce(after);

      await service.updateEntityIdentity('e1', { archetype: 'Warrior' });

      expect(mockPrisma.entity.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { archetype: 'Warrior' },
      });
      expect(mockEmbeddingService.onEntityWrite).toHaveBeenCalledWith(before, after);
    });
  });

  describe('semanticRecall (Phase 1 → Phase 2 composition)', () => {
    it('calls generateEmbedding, findSimilarEntityIds, then enrichWithState and returns entities + scores', async () => {
      const similarIds = [{ id: 'e1', similarity: 0.9 }];
      const enriched = [{
        id: 'e1', name: 'Elara', type: 'character', archetype: null,
        backstory: null, role: null, tags: [], facts: {}, state: { health: 100 },
        identity_version: 0, fromEdges: [], toEdges: [],
      }];
      (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce(similarIds);
      (mockPrisma.entity.findMany as jest.Mock).mockResolvedValueOnce(enriched);

      const result = await service.semanticRecall('a brave hero', 5);

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith('a brave hero');
      expect(result.entities[0].id).toBe('e1');
      expect(result.scores.get('e1')).toBe(0.9);
    });

    it('returns empty entities and empty scores when no similar entities found', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);
      const result = await service.semanticRecall('obscure query', 5);
      expect(result.entities).toEqual([]);
      expect(result.scores.size).toBe(0);
      expect(mockPrisma.entity.findMany).not.toHaveBeenCalled();
    });
  });

  describe('enrichWithState (Phase 2 — graph layer)', () => {
    const base = {
      id: 'e1', name: 'Elara', type: 'character', archetype: null,
      backstory: null, role: null, tags: [], facts: {}, state: { health: 100 },
      identity_version: 0, fromEdges: [], toEdges: [],
    };

    it('fetches entities with edges and preserves Phase 1 ordering', async () => {
      const e1 = { ...base, id: 'e1' };
      const e2 = { ...base, id: 'e2', name: 'Drake' };
      (mockPrisma.entity.findMany as jest.Mock).mockResolvedValueOnce([e2, e1]); // DB returns out of order

      const result = await service.enrichWithState(['e1', 'e2']);

      expect(mockPrisma.entity.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['e1', 'e2'] } },
        include: { fromEdges: true, toEdges: true },
      });
      expect(result[0].id).toBe('e1');
      expect(result[1].id).toBe('e2');
    });

    it('returns empty array without hitting DB when ids is empty', async () => {
      const result = await service.enrichWithState([]);
      expect(mockPrisma.entity.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findSimilarEntityIds (Phase 1 — vector layer)', () => {
    it('calls $queryRawUnsafe and returns id+similarity pairs above threshold', async () => {
      const rows = [{ id: 'e1', similarity: 0.95 }, { id: 'e2', similarity: 0.80 }];
      (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce(rows);

      const embedding = Array.from({ length: 384 }, () => 0.1);
      const result = await service.findSimilarEntityIds(embedding, 5, 0.7);

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
      expect(result).toEqual(rows);
    });

    it('returns empty array when no entities meet the threshold', async () => {
      (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);
      const embedding = Array.from({ length: 384 }, () => 0.1);
      const result = await service.findSimilarEntityIds(embedding, 5, 0.99);
      expect(result).toEqual([]);
    });
  });

  describe('getAllEntitiesWithEdges', () => {
    it('queries for non-rule entities with fromEdges and toEdges included', async () => {
      const entities = [
        { id: 'e1', type: 'character', name: 'Elara', fromEdges: [], toEdges: [] },
      ];
      (mockPrisma.entity.findMany as jest.Mock).mockResolvedValueOnce(entities);

      const result = await service.getAllEntitiesWithEdges();

      expect(mockPrisma.entity.findMany).toHaveBeenCalledWith({
        where: { type: { notIn: ['rule'] } },
        include: { fromEdges: true, toEdges: true },
      });
      expect(result).toEqual(entities);
    });
  });
});
