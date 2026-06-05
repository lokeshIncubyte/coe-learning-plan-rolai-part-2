---
id: srv-038
slug: graph-service-update-entity-identity
status: done
source: "GraphService.updateEntityIdentity(id, patch) updates identity fields and fires the onEntityWrite hook. Throws NotFoundException when entity is missing."
covers: happy-path
group: graph-service-hybrid-vector-graph
---

## Behavior
`GraphService.updateEntityIdentity(id, patch)` updates identity fields (such as `archetype`, `backstory`, `role`, `name`, `type`) on an entity. After writing, it fires `embeddingService.onEntityWrite(before, after)` so the embedding layer can detect whether a semantic identity shift occurred and trigger re-embedding. The `NotFoundException` path (when the entity is not found) is covered in srv-054.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  describe('updateEntityIdentity', () => {
    it('updates identity fields and calls onEntityWrite hook', async () => {
      const before = { id: 'e1', name: 'TestChar', type: 'character', archetype: 'Mage', backstory: null, role: null };
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
  ```
- **Why it fails**: `service.updateEntityIdentity` is `undefined` — the method does not exist on the current `GraphService` in `main`.

## GREEN
- **Smallest change**: Add `async updateEntityIdentity(id: string, patch: Record<string, unknown>)` to `graph.service.ts`. Read the entity with `prisma.entity.findUnique({ where: { id } })`. Call `prisma.entity.update({ where: { id }, data: patch })` to get `after`, then call `this.embeddingService.onEntityWrite(before, after)` (cast both to `Record<string, unknown>`). Return `after`. No null check or NotFoundException yet — that is added in srv-054.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
