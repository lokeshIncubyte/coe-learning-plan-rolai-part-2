---
id: cycle-039
slug: graph-service-update-entity-state-re-embed-hook
status: pending
source: "GraphService.updateEntityState wires onEntityWrite after the transaction so EmbeddingService can check for identity shift."
covers: error-path
group: graph-service-hybrid-vector-graph
---

## Behavior
`GraphService.updateEntityState(id, patch)` already merges a patch into the entity's `state` JSON field and persists it inside a `$transaction`. This cycle wires the `embeddingService.onEntityWrite(before, after)` call at the end of that transaction callback, so the embedding layer receives both the pre- and post-update entity and can decide whether re-embedding is needed (for a plain state mutation it will not fire re-embedding, but the hook must still be called to allow that check). The existing merge-and-write test must continue to pass unchanged.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  describe('updateEntityState', () => {
    // existing test (must still pass — do not remove):
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

    // NEW test added in this cycle:
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
  ```
- **Why it fails**: `mockEmbeddingService.onEntityWrite` is never called by the current `updateEntityState` — the method exists on `main` but has no reference to `embeddingService` (the current constructor only takes `PrismaService`). After cycle-037 adds the `embeddingService` constructor param, this test will still fail until the hook call is added inside the transaction.

## GREEN
- **Smallest change**: Inside the `$transaction` callback in `updateEntityState`, change the local variable from `entity` to `before` for clarity, capture the result of `entity.update` as `after`, add `await this.embeddingService.onEntityWrite(before as Record<string, unknown>, after as Record<string, unknown>)` after the update (still inside the transaction), and return `after`. This depends on cycle-037 having already added `embeddingService` to the constructor; apply both changes in the same GREEN step if cycle-037 has not yet been applied.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
