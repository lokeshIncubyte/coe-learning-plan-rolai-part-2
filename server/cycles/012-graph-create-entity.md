---
id: cycle-012
slug: graph-create-entity
status: pending
source: "cycle-012 spec — GraphService.createEntity calls prisma.entity.create, returns created record"
covers: happy-path
---

## Behavior
`GraphService.createEntity(data)` calls `this.prisma.entity.create({ data })` and returns the created record. `GraphService` now receives `PrismaService` via constructor injection. The stale `getEntities()` stub and its test in `stub-services.spec.ts` are removed in this cycle's GREEN step.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  import { GraphService } from './graph.service';
  import { PrismaService } from '../prisma/prisma.service';
  import { NotFoundException } from '@nestjs/common';

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
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  describe('GraphService', () => {
    let service: GraphService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new GraphService(mockPrisma);
    });

    describe('createEntity', () => {
      it('calls prisma.entity.create with data and returns the created record', async () => {
        const now = new Date();
        const created = {
          id: 'e1',
          type: 'character',
          name: 'Elara',
          tags: [],
          facts: {},
          state: {},
          createdAt: now,
          updatedAt: now,
        };
        (mockPrisma.entity.create as jest.Mock).mockResolvedValueOnce(created);

        const result = await service.createEntity({
          type: 'character',
          name: 'Elara',
          tags: [],
        });

        expect(mockPrisma.entity.create).toHaveBeenCalledWith({
          data: { type: 'character', name: 'Elara', tags: [] },
        });
        expect(result).toEqual(created);
        expect(result.id).toBe('e1');
        expect(result.name).toBe('Elara');
      });
    });
  });
  ```
- **Why it fails**: `GraphService` does not have a `createEntity` method and does not accept `PrismaService` in its constructor, so the import-and-construct sequence fails the assertion.

## GREEN
- **Smallest change**: Rewrite `src/generate/graph.service.ts` — add a constructor parameter `private readonly prisma: PrismaService`, remove the `getEntities()` stub, and add `async createEntity(data: any)` that returns `this.prisma.entity.create({ data })`. Remove the `describe('GraphService')` block (the `getEntities returns an array` test) from `src/generate/stub-services.spec.ts`.
- **Files touched**: `src/generate/graph.service.ts`, `src/generate/stub-services.spec.ts`

## REFACTOR
none
