import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GraphService } from './graph.service';
import { PrismaService } from '../prisma/prisma.service';

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
} as unknown as PrismaService;

describe('GraphService', () => {
  let service: GraphService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GraphService(mockPrisma);
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
});
