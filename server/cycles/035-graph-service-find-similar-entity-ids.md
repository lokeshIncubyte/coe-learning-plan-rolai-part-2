---
id: cycle-035
slug: graph-service-find-similar-entity-ids
status: pending
source: "GraphService.findSimilarEntityIds(queryEmbedding, limit, threshold) performs a Phase 1 pgvector cosine-similarity search using $queryRawUnsafe."
covers: happy-path
group: graph-service-hybrid-vector-graph
---

## Behavior
`GraphService.findSimilarEntityIds(queryEmbedding, limit, threshold)` performs a Phase 1 pgvector cosine-similarity search against the `Entity` table using `$queryRawUnsafe`. It returns `Array<{ id: string; similarity: number }>` containing only entities whose embedding is non-null and whose cosine similarity meets or exceeds `threshold` (default `0.7`). `$queryRawUnsafe` is used in place of the tagged-template `$queryRaw` because the pgvector adapter misparses parameterised vector strings when passed through tagged templates — the same root cause described in the project memory note on pgvector.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  // Note: add `$queryRawUnsafe: jest.fn()` to mockPrisma before this describe block runs.

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
  ```
- **Why it fails**: `service.findSimilarEntityIds` is `undefined`; additionally `mockPrisma.$queryRawUnsafe` does not exist in the current spec so the cast would throw.

## GREEN
- **Smallest change**: Add `$queryRawUnsafe: jest.fn()` to the `mockPrisma` object in the spec. Add `async findSimilarEntityIds(queryEmbedding: number[], limit: number, threshold = 0.7): Promise<Array<{ id: string; similarity: number }>>` to `graph.service.ts`. Build the vector string as `` `[${queryEmbedding.join(',')}]` `` and pass it inline in the SQL string to `$queryRawUnsafe`, with `threshold` and `limit` as positional params `$1` and `$2` respectively. The SQL selects `id` and `1 - (embedding <=> '<vector>'::vector)` AS `similarity` from `"Entity"` where `embedding IS NOT NULL` and the similarity is `>= $1`, ordered by distance, limited by `$2`.
- **Files touched**: `src/generate/graph.service.ts`, `src/generate/graph.service.spec.ts`

## REFACTOR
none
