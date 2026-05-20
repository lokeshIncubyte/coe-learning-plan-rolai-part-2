import { TraversalService } from './traversal.service';
import type { EnrichedEntity } from './graph.service';

function makeEntity(
  id: string,
  fromEdges: Array<{ fromId: string; toId: string; weight?: number; tags?: string[] }> = [],
  toEdges:   Array<{ fromId: string; toId: string; weight?: number; tags?: string[] }> = [],
): EnrichedEntity {
  return { id, name: `Entity-${id}`, type: 'character', archetype: null, backstory: null,
           role: null, tags: [], facts: {}, state: {}, identity_version: 0,
           createdAt: new Date(), updatedAt: new Date(), fromEdges, toEdges };
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
