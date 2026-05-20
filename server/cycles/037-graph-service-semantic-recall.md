---
id: cycle-037
slug: graph-service-semantic-recall
status: done
source: "GraphService.semanticRecall(queryText, limit) composes Phase 1 → Phase 2 and returns { entities, scores }. Adds EmbeddingService as constructor dependency."
covers: happy-path
group: graph-service-hybrid-vector-graph
---

## Behavior
`GraphService.semanticRecall(queryText, limit)` is the full Phase 1 → Phase 2 composition method. It calls `embeddingService.generateEmbedding(queryText)` to obtain a query vector, passes that vector to `findSimilarEntityIds`, then passes the returned IDs to `enrichWithState`. It returns `{ entities: EnrichedEntity[], scores: Map<string, number> }` where `scores` maps each entity's `id` to its Phase 1 cosine-similarity value — that map is consumed later by `TraversalService.scoreWithSemantics`. This cycle introduces `EmbeddingService` as a constructor-injected dependency of `GraphService`. The empty-candidates early-return (skip `enrichWithState` when `findSimilarEntityIds` returns nothing) is covered in cycle-053.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  // Add near top of spec file (after imports):
  const mockEmbeddingService = {
    generateEmbedding: jest.fn().mockResolvedValue(Array.from({ length: 384 }, () => 0.1)),
    onEntityWrite: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmbeddingService;

  // In beforeEach, change constructor call to:
  service = new GraphService(mockPrisma, mockEmbeddingService);

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
  });
  ```
- **Why it fails**: `service.semanticRecall` is `undefined`; `GraphService` constructor in `main` takes only one argument (`PrismaService`), so `new GraphService(mockPrisma, mockEmbeddingService)` would compile but the method is absent. An import of `EmbeddingService` in the spec would also fail if the type is not exported.

## GREEN
- **Smallest change**: Import `EmbeddingService` into `graph.service.ts` and add it as a second constructor parameter (`private readonly embeddingService: EmbeddingService`). Export the `SemanticRecallResult` type. Add `async semanticRecall(queryText: string, limit = 5): Promise<SemanticRecallResult>` that calls `this.embeddingService.generateEmbedding(queryText)`, then `this.findSimilarEntityIds(embedding, limit)`, builds the `scores` Map, calls `this.enrichWithState(candidates.map(c => c.id))`, and returns `{ entities, scores }`. In the spec: add `EmbeddingService` to imports, define `mockEmbeddingService`, and change every `new GraphService(mockPrisma)` to `new GraphService(mockPrisma, mockEmbeddingService)`. No empty-candidates guard yet — that is added in cycle-053.
- **Files touched**: `src/generate/graph.service.ts`, `src/generate/graph.service.spec.ts`

## REFACTOR
none
