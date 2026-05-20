---
id: cycle-053
slug: graph-service-semantic-recall-empty-candidates
status: skip
source: "GraphService.semanticRecall — skips enrichWithState and returns empty result when no similar entities found"
covers: error-path
group: graph-service-hybrid-vector-graph
---

## Behavior
When `findSimilarEntityIds` returns an empty array (no embeddings meet the threshold), `semanticRecall` returns `{ entities: [], scores: new Map() }` immediately without calling `enrichWithState`. This prevents a superfluous `findMany` call with an empty `IN` clause. The happy path (candidates found, enrichment called) is covered in cycle-037.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion** (add inside the existing `describe('semanticRecall')` block, after the happy-path test):
  ```ts
  it('returns empty entities and empty scores when no similar entities found', async () => {
    (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([]);
    const result = await service.semanticRecall('obscure query', 5);
    expect(result.entities).toEqual([]);
    expect(result.scores.size).toBe(0);
    expect(mockPrisma.entity.findMany).not.toHaveBeenCalled();
  });
  ```
- **Why it fails**: After cycle-037's GREEN, `semanticRecall` calls `enrichWithState(candidates.map(c => c.id))` unconditionally — when `candidates` is empty this calls `enrichWithState([])` which (after cycle-052) returns `[]` without hitting the DB, but `enrichWithState` itself is still called, potentially triggering `toHaveBeenCalled` on `findMany` if cycle-052 has not been applied. More importantly, the intent is that `semanticRecall` itself must short-circuit before calling `enrichWithState` at all.

## GREEN
- **Smallest change**: In `semanticRecall`, after `findSimilarEntityIds` resolves and `candidates` is set, add: `if (candidates.length === 0) return { entities: [], scores: new Map() };` before the `enrichWithState` call.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
