---
id: srv-036
slug: graph-service-enrich-with-state
status: done
source: "GraphService.enrichWithState(ids) fetches entities and their edges by ID list (Phase 2), preserving Phase 1 ordering."
covers: happy-path
group: graph-service-hybrid-vector-graph
---

## Behavior
`GraphService.enrichWithState(ids)` is the Phase 2 graph-layer fetch. It retrieves entities by ID list from Prisma, including their `fromEdges` and `toEdges` relations. It preserves the Phase 1 ordering — if IDs arrive in similarity order, the returned array is in that same order even when the database returns rows in a different sequence. The empty-ids guard (returning `[]` without hitting the database) is covered in srv-052.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
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
  });
  ```
- **Why it fails**: `service.enrichWithState` is `undefined` — the method does not exist on the current `GraphService` in `main`.

## GREEN
- **Smallest change**: Add `async enrichWithState(ids: string[]): Promise<EnrichedEntity[]>` to `graph.service.ts`. Call `prisma.entity.findMany({ where: { id: { in: ids } }, include: { fromEdges: true, toEdges: true } })`. Re-sort by building a `Map` keyed by entity `id`, then mapping over the original `ids` array to restore Phase 1 order, filtering out missing entries. No empty-ids guard yet — that is added in srv-052.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
