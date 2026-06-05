---
id: srv-034
slug: graph-service-get-all-entities-with-edges
status: done
source: "GraphService.getAllEntitiesWithEdges() returns all entities whose type is not 'rule', including their fromEdges and toEdges."
covers: happy-path
group: graph-service-hybrid-vector-graph
---

## Behavior
`GraphService.getAllEntitiesWithEdges()` queries Prisma for all entities whose `type` is not in `['rule']`, including their `fromEdges` and `toEdges` relations. It returns the result as `EnrichedEntity[]`. This method serves as the fallback retrieval path used when Phase 1 semantic recall returns no candidates (i.e., no embeddings exist in the database yet).

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  describe('getAllEntitiesWithEdges', () => {
    it('queries for non-rule entities with fromEdges and toEdges included', async () => {
      const entities = [
        { id: 'e1', type: 'character', name: 'Mira', fromEdges: [], toEdges: [] },
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
  ```
- **Why it fails**: `service.getAllEntitiesWithEdges` is `undefined` — the method does not exist on the current `GraphService` in `main`.

## GREEN
- **Smallest change**: Add `async getAllEntitiesWithEdges(): Promise<EnrichedEntity[]>` to `src/generate/graph.service.ts`. The body is a single `prisma.entity.findMany` call with `where: { type: { notIn: ['rule'] } }` and `include: { fromEdges: true, toEdges: true }`, cast to `EnrichedEntity[]`. Also export the `EnrichedEntity` type from the same file (needed by later cycles).
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
