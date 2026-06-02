---
id: srv-052
slug: graph-service-enrich-with-state-empty-guard
status: done
source: "GraphService.enrichWithState — returns [] immediately without hitting DB when ids is empty"
covers: error-path
group: graph-service-hybrid-vector-graph
---

## Behavior
When `enrichWithState` is called with an empty `ids` array it returns `[]` immediately without calling `prisma.entity.findMany`. This guard prevents an unnecessary database round-trip when `findSimilarEntityIds` returns no candidates. The fetch-and-reorder happy path is covered in srv-036.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion** (add inside the existing `describe('enrichWithState')` block, after the happy-path test):
  ```ts
  it('returns empty array without hitting DB when ids is empty', async () => {
    const result = await service.enrichWithState([]);
    expect(mockPrisma.entity.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
  ```
- **Why it fails**: After srv-036's GREEN, `enrichWithState` calls `prisma.entity.findMany` unconditionally — when called with `[]` it hits the database (triggering the `toHaveBeenCalled` assertion) instead of returning early.

## GREEN
- **Smallest change**: At the top of `enrichWithState`, add `if (ids.length === 0) return [];` before the `findMany` call.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
