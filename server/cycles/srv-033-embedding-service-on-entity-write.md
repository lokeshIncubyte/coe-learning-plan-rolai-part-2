---
id: srv-033
slug: embedding-service-on-entity-write
status: done
source: "Group B: EmbeddingService.onEntityWrite — re-embeds + increments identity_version only on identity shift"
covers: happy-path
group: embedding-service
---

## Behavior
`EmbeddingService.onEntityWrite(before, after)` is the hook called by `GraphService` after any entity write. It calls `shouldReembed(before, after)` and, only if it returns `true`, increments `identity_version` via `prisma.entity.update` and then calls `embedEntityIdentity`. State-only mutations never reach the embedding pipeline.

## RED
- **Test file**: `src/generate/embedding.service.spec.ts`
- **Assertion**:
  ```ts
  describe('onEntityWrite', () => {
    it('re-embeds and increments identity_version when an identity field changes', async () => {
      const before = { id: 'e1', name: 'Mira', type: 'character', archetype: 'Mage', backstory: null, role: null, state: {} };
      const after  = { id: 'e1', name: 'Mira', type: 'character', archetype: 'Warrior', backstory: null, role: null, state: {} };

      (mockPrisma.entity.update as jest.Mock).mockResolvedValueOnce({ ...after, identity_version: 1 });
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(after);
      (mockPrisma.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(1);

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
  ```
- **Why it fails**: `service.onEntityWrite` is `undefined` — the method does not exist yet.

## GREEN
- **Smallest change**: Add `async onEntityWrite(before: Record<string, unknown>, after: Record<string, unknown>): Promise<void>` to `EmbeddingService`. If `shouldReembed(before, after)` is false, return immediately. Otherwise call `this.prisma.entity.update({ where: { id: after['id'] as string }, data: { identity_version: { increment: 1 } } })`, then `this.embedEntityIdentity(after['id'] as string)`.
- **Files touched**: `src/generate/embedding.service.ts`

## REFACTOR
none
