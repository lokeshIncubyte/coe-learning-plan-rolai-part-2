---
id: cycle-042
slug: traversal-service-score-with-semantics
status: pending
source: "TraversalService.scoreWithSemantics(traversed, phase1Scores) re-ranks by blending proximityScore and Phase 1 similarity at 50/50 weight."
covers: happy-path
group: traversal-service-hybrid-vector-graph
---

## Behavior
`TraversalService.scoreWithSemantics(traversed, phase1Scores)` re-ranks a list of `TraversedEntity` objects by blending graph proximity with Phase 1 semantic similarity. The formula is `combinedScore = 0.5 * proximityScore + 0.5 * (phase1Score ?? 0)`, where `phase1Score` is looked up from the `phase1Scores` Map by entity `id` and defaults to `0` when absent. Results are returned sorted by `combinedScore` descending. No external calls are made — this is pure in-memory computation over the already-traversed list.

## RED
- **Test file**: `src/generate/traversal.service.spec.ts`
- **Assertion** (add inside the `describe('TraversalService')` block, after the tag-filtering tests):
  ```ts
  describe('scoreWithSemantics', () => {
    function makeTraversed(id: string, proximityScore: number) {
      return { ...makeEntity(id), proximityScore, combinedScore: proximityScore };
    }

    it('combines proximityScore and phase1Score at 0.5/0.5 weight', () => {
      const traversed = [makeTraversed('e1', 0.8), makeTraversed('e2', 0.4)];
      const scores = new Map([['e1', 0.6], ['e2', 1.0]]);
      const result = service.scoreWithSemantics(traversed, scores);
      // e1: 0.5*0.8 + 0.5*0.6 = 0.70
      // e2: 0.5*0.4 + 0.5*1.0 = 0.70
      expect(result.find(e => e.id === 'e1')!.combinedScore).toBeCloseTo(0.7);
      expect(result.find(e => e.id === 'e2')!.combinedScore).toBeCloseTo(0.7);
    });

    it('uses 0 for phase1Score when entity has no Phase 1 score', () => {
      const result = service.scoreWithSemantics([makeTraversed('e1', 0.6)], new Map());
      expect(result[0].combinedScore).toBeCloseTo(0.3); // 0.5*0.6 + 0.5*0 = 0.3
    });

    it('sorts results by combinedScore descending', () => {
      const traversed = [makeTraversed('e1', 0.2), makeTraversed('e2', 0.8), makeTraversed('e3', 0.5)];
      const scores = new Map([['e1', 0.9], ['e2', 0.1], ['e3', 0.5]]);
      const result = service.scoreWithSemantics(traversed, scores);
      // e1: 0.5*0.2 + 0.5*0.9 = 0.55
      // e3: 0.5*0.5 + 0.5*0.5 = 0.50
      // e2: 0.5*0.8 + 0.5*0.1 = 0.45
      expect(result[0].id).toBe('e1');
      expect(result[1].id).toBe('e3');
      expect(result[2].id).toBe('e2');
    });
  });
  ```
- **Why it fails**: `service.scoreWithSemantics` is `undefined` — the method does not exist on the `TraversalService` created in cycle-040.

## GREEN
- **Smallest change**: Add `scoreWithSemantics(traversed: TraversedEntity[], phase1Scores: Map<string, number>): TraversedEntity[]` to `TraversalService`. Map over `traversed`, compute `combinedScore = 0.5 * e.proximityScore + 0.5 * (phase1Scores.get(e.id) ?? 0)` for each entry (spread the entity and override `combinedScore`), then sort the mapped array by `combinedScore` descending and return it.
- **Files touched**: `src/generate/traversal.service.ts`

## REFACTOR
none
