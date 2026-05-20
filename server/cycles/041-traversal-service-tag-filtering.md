---
id: cycle-041
slug: traversal-service-tag-filtering
status: pending
source: "traverse with a non-empty tags array only follows edges whose tags array contains at least one of the filter tags."
covers: error-path
group: traversal-service-hybrid-vector-graph
---

## Behavior
When `traverse` is called with a non-empty `tags` array, it only follows edges whose `tags` field contains at least one element in common with the filter array. Edges with no tag overlap are skipped, so the entities reachable only through those edges are excluded from the result. When the `tags` parameter is omitted or empty, all edges are followed regardless of their tags, preserving the behavior from cycle-040.

## RED
- **Test file**: `src/generate/traversal.service.spec.ts`
- **Assertion** (add inside the `describe('TraversalService')` block, after the BFS core tests):
  ```ts
  describe('traverse — tag filtering', () => {
    it('only follows edges that share at least one tag when filter is provided', () => {
      const a = makeEntity('a', [
        { fromId: 'a', toId: 'b', weight: 1, tags: ['combat'] },
        { fromId: 'a', toId: 'c', weight: 1, tags: ['social'] },
      ]);
      const result = service.traverse('a', [a, makeEntity('b'), makeEntity('c')], 2, ['combat']);
      const ids = result.map(e => e.id);
      expect(ids).toContain('b');
      expect(ids).not.toContain('c');
    });

    it('follows all edges when no tags filter is provided', () => {
      const a = makeEntity('a', [
        { fromId: 'a', toId: 'b', weight: 1, tags: ['combat'] },
        { fromId: 'a', toId: 'c', weight: 1, tags: ['social'] },
      ]);
      const result = service.traverse('a', [a, makeEntity('b'), makeEntity('c')], 2);
      expect(result.map(e => e.id)).toContain('b');
      expect(result.map(e => e.id)).toContain('c');
    });

    it('returns only the anchor when no edges match the tag filter', () => {
      const a = makeEntity('a', [{ fromId: 'a', toId: 'b', weight: 1, tags: ['combat'] }]);
      const result = service.traverse('a', [a, makeEntity('b')], 2, ['social']);
      expect(result.map(e => e.id)).toContain('a');
      expect(result.map(e => e.id)).not.toContain('b');
    });
  });
  ```
- **Why it fails**: The current `traverse` implementation from cycle-040 ignores the `tags` parameter entirely — it follows all edges and therefore returns both `'b'` and `'c'` even when only `['combat']` edges should be traversed, causing the first assertion to fail.

## GREEN
- **Smallest change**: Inside the BFS neighbor loop in `traverse`, add a tag-filter guard before enqueuing a neighbor: `if (tags && tags.length > 0) { const hasOverlap = neighbor.edgeTags.some(t => tags.includes(t)); if (!hasOverlap) continue; }`. This is the exact check already present in the worktree reference implementation.
- **Files touched**: `src/generate/traversal.service.ts`

## REFACTOR
none
