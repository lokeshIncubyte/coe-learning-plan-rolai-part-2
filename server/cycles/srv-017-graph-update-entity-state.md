---
id: srv-017
slug: graph-update-entity-state
status: done
source: "srv-017 spec — GraphService.updateEntityState uses $transaction to read-merge-write state"
covers: happy-path
---

## Behavior
`GraphService.updateEntityState(id, patch)` uses `prisma.$transaction` to read the entity's current `state`, merges the patch object over it via object spread, then writes the merged state back via `prisma.entity.update`. This read-modify-write pattern runs inside a single transaction to avoid lost-update races.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  // Add inside the existing describe('GraphService') block.

  describe('updateEntityState', () => {
    it('reads current state, merges patch, and writes merged state inside a transaction', async () => {
      const existingEntity = { id: 'e1', state: { health: 100 } };
      const updatedEntity = { id: 'e1', state: { health: 80, status: 'wounded' } };

      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(existingEntity);
      (mockPrisma.entity.update as jest.Mock).mockResolvedValueOnce(updatedEntity);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
      );

      const result = await service.updateEntityState('e1', {
        health: 80,
        status: 'wounded',
      });

      expect(mockPrisma.entity.findUnique).toHaveBeenCalledWith({
        where: { id: 'e1' },
      });
      expect(mockPrisma.entity.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { state: { health: 80, status: 'wounded' } },
      });
      expect(result).toEqual(updatedEntity);
    });
  });
  ```
- **Why it fails**: `updateEntityState` does not exist on `GraphService`.

## GREEN
- **Smallest change**: Add `async updateEntityState(id: string, patch: Record<string, unknown>)` to `src/generate/graph.service.ts`. The implementation calls `this.prisma.$transaction(async (tx) => { const entity = await tx.entity.findUnique({ where: { id } }); const merged = { ...(entity?.state as object ?? {}), ...patch }; return tx.entity.update({ where: { id }, data: { state: merged } }); })`.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
