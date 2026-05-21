---
id: cycle-005
slug: engine-classify-deltas
status: done
source: "Day 9: Identity-shift detector — engine inspects incoming deltas and flags semantic identity changes"
covers: atomic
---

## Dependencies

**(none — pure logic cycle)**

## Behavior
`EngineService.classifyDeltas()` partitions a mixed `Delta[]` into `{ stateMutations: StateMutationDelta[]; identityShifts: IdentityShiftDelta[] }`. Deltas with op `new_entity` and `new_edge` are excluded from both buckets (they belong to ExtractorService). This is the engine's identity-shift detector: it determines which deltas can be written directly to the graph (state layer) versus which must trigger an async re-embed job. Integration smoke: real `EngineService`, input `[state_mutation, identity_shift, new_entity, new_edge]` → `stateMutations.length === 1`, `identityShifts.length === 1`.

## RED
- **Test file**: `server/src/generate/engine.service.spec.ts`
- **Assertion**:
  ```ts
  import type { Delta } from '../upload/extractor.service';

  describe('classifyDeltas', () => {
    it('separates state_mutation and identity_shift; ignores new_entity and new_edge', () => {
      const engine = new EngineService(null as any);
      const deltas: Delta[] = [
        { op: 'state_mutation', entityId: 'e1', patch: { hp: 50 } },
        { op: 'identity_shift', entityId: 'e2', patch: { archetype: 'Warrior' } },
        { op: 'new_entity', identity: { name: 'X', type: 'item' }, state: {} },
        { op: 'new_edge', fromId: 'e1', toId: 'e2', type: 'ally' },
      ];
      const { stateMutations, identityShifts } = engine.classifyDeltas(deltas);
      expect(stateMutations).toHaveLength(1);
      expect(stateMutations[0].entityId).toBe('e1');
      expect(identityShifts).toHaveLength(1);
      expect(identityShifts[0].entityId).toBe('e2');
    });
  });
  ```
- **Why it fails**: `EngineService` has no `classifyDeltas` method.

## GREEN
- **Smallest change**: Add `classifyDeltas(deltas: Delta[]): { stateMutations: StateMutationDelta[]; identityShifts: IdentityShiftDelta[] }` to `EngineService` — filter by `op === 'state_mutation'` and `op === 'identity_shift'` respectively using type-narrowing.
- **Files touched**: `server/src/generate/engine.service.ts`

## REFACTOR
none
