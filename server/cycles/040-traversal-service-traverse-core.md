---
id: cycle-040
slug: traversal-service-traverse-core
status: pending
source: "TraversalService.traverse(anchorId, entities, maxDepth, tags?) performs BFS from anchorId through entity edges with proximityScore assignment."
covers: happy-path
group: traversal-service-hybrid-vector-graph
---

## Behavior
`TraversalService.traverse(anchorId, entities, maxDepth, tags?)` performs a BFS from `anchorId` through the entity graph. It follows both `fromEdges` (outgoing) and `toEdges` (incoming, treated bidirectionally) up to `maxDepth` hops. A visited set prevents duplicates and cycles. Each reached entity receives a `proximityScore`: `1.0` at hop 0 (the anchor itself), and `1 / (1 + hopCount * edgeWeight)` for nodes reached at hop > 0. When `anchorId` is an empty string or not found in the entity list, all entities are included at hop 0 with `proximityScore = 1.0`. The returned array is sorted by `proximityScore` descending. This cycle creates `traversal.service.ts` from scratch.

## RED
- **Test file**: `src/generate/traversal.service.spec.ts`
- **Assertion**:
  ```ts
  import { TraversalService } from './traversal.service';
  import type { EnrichedEntity } from './graph.service';

  function makeEntity(
    id: string,
    fromEdges: Array<{ fromId: string; toId: string; weight?: number; tags?: string[] }> = [],
    toEdges:   Array<{ fromId: string; toId: string; weight?: number; tags?: string[] }> = [],
  ): EnrichedEntity {
    return { id, name: `Entity-${id}`, type: 'character', archetype: null, backstory: null,
             role: null, tags: [], facts: {}, state: {}, identity_version: 0, fromEdges, toEdges };
  }

  describe('TraversalService', () => {
    let service: TraversalService;
    beforeEach(() => { service = new TraversalService(); });

    describe('traverse — BFS core', () => {
      it('returns only the anchor when no edges exist', () => {
        const result = service.traverse('a', [makeEntity('a'), makeEntity('b')], 2);
        expect(result.map(e => e.id)).toContain('a');
        expect(result.find(e => e.id === 'b')).toBeUndefined();
      });

      it('follows fromEdges up to maxDepth (chain: a→b→c→d, depth=2 stops at c)', () => {
        const a = makeEntity('a', [{ fromId: 'a', toId: 'b', weight: 1 }]);
        const b = makeEntity('b', [{ fromId: 'b', toId: 'c', weight: 1 }]);
        const c = makeEntity('c', [{ fromId: 'c', toId: 'd', weight: 1 }]);
        const d = makeEntity('d');
        const result = service.traverse('a', [a, b, c, d], 2);
        const ids = result.map(e => e.id);
        expect(ids).toContain('a');
        expect(ids).toContain('b');
        expect(ids).toContain('c');
        expect(ids).not.toContain('d');
      });

      it('does NOT revisit already-visited nodes (cycle prevention)', () => {
        const a = makeEntity('a', [{ fromId: 'a', toId: 'b', weight: 1 }]);
        const b = makeEntity('b', [{ fromId: 'b', toId: 'a', weight: 1 }]);
        const result = service.traverse('a', [a, b], 5);
        expect(result.filter(e => e.id === 'a')).toHaveLength(1);
        expect(result.filter(e => e.id === 'b')).toHaveLength(1);
      });

      it('assigns proximityScore = 1.0 to the anchor (hop 0)', () => {
        const result = service.traverse('a', [makeEntity('a')], 2);
        expect(result.find(e => e.id === 'a')?.proximityScore).toBe(1.0);
      });

      it('assigns lower proximityScore to nodes farther from the anchor', () => {
        const a = makeEntity('a', [{ fromId: 'a', toId: 'b', weight: 1 }]);
        const b = makeEntity('b', [{ fromId: 'b', toId: 'c', weight: 1 }]);
        const c = makeEntity('c');
        const result = service.traverse('a', [a, b, c], 2);
        const nodeA = result.find(e => e.id === 'a')!;
        const nodeB = result.find(e => e.id === 'b')!;
        const nodeC = result.find(e => e.id === 'c')!;
        expect(nodeA.proximityScore).toBeGreaterThan(nodeB.proximityScore);
        expect(nodeB.proximityScore).toBeGreaterThan(nodeC.proximityScore);
      });

      it('includes all entities at hop 0 when anchorId is empty or not in entity list', () => {
        const entities = [makeEntity('a'), makeEntity('b'), makeEntity('c')];
        const result = service.traverse('', entities, 2);
        expect(result.map(e => e.id)).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      });
    });
  });
  ```
- **Why it fails**: `src/generate/traversal.service.ts` does not exist — import resolves to `undefined` and Jest throws a module-not-found error.

## GREEN
- **Smallest change**: Create `src/generate/traversal.service.ts` with an `@Injectable() TraversalService` class. Export the `TraversedEntity` type (defined as `EnrichedEntity & { proximityScore: number; combinedScore: number }`). Export an `EdgeLike` type for internal use. Implement `traverse(anchorId, entities, maxDepth, tags?)` with: (1) build an entity map and adjacency list from both `fromEdges` and `toEdges`; (2) seed the BFS queue — from the anchor if valid, otherwise from all entities at hop 0; (3) BFS loop with a `visited` Map to prevent revisits and a depth cap at `maxDepth`; (4) compute `proximityScore = hopCount === 0 ? 1.0 : 1.0 / (1 + hopCount * edgeWeight)` for each visited node; (5) return sorted by `proximityScore` descending. Also create the spec file `src/generate/traversal.service.spec.ts` with the test above.
- **Files touched**: `src/generate/traversal.service.ts`, `src/generate/traversal.service.spec.ts`

## REFACTOR
Extract the adjacency-list builder into a private helper `buildAdjacency(entities)` to keep `traverse` readable once tag-filtering is added in cycle-041.
