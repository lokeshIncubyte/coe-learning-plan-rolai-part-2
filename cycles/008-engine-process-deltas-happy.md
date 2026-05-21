---
id: cycle-008
slug: engine-process-deltas-happy
status: done
source: "Day 9: Engine returns resolved deltas; identity-shift deltas flagged for re-embed, state mutations written"
covers: happy-path
group: engine-apply-delta
boundary-covered-by: cycle-007
---

## Dependencies

### Prisma
Model: Entity — state layer writes only. `graphService.updateEntityState` is mocked; boundary error pattern established by cycle-007.
```
export type EntityCreateInput = {
  id?: string
  type: string
  name: string
  tags?: EntityCreatetagsInput | string[]
  facts?: JsonNullValueInput | InputJsonValue
  archetype?: string | null
  backstory?: string | null
  role?: string | null
  identity_version?: number
  state?: JsonNullValueInput | InputJsonValue
  last_beat?: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
  fromEdges?: EdgeCreateNestedManyWithoutFromInput
  toEdges?: EdgeCreateNestedManyWithoutToInput
}
```

## Behavior
`EngineService.processDeltas(deltas, spec)` classifies the delta array via `classifyDeltas`, applies each `state_mutation` delta through `applyStateMutationDelta`, and returns identity_shift deltas as `{ flaggedForReEmbed: IdentityShiftDelta[] }` without writing them. This is the architectural invariant: only state mutations reach the graph layer via the engine; identity shifts are deferred to the embedding pipeline. Integration smoke (pre-squash gate for engine-apply-delta group): call `processDeltas` on a real `GraphService` backed by real Prisma with a seeded entity — verify the entity's state is updated in the DB and the `identity_shift` delta is returned inside `flaggedForReEmbed`.

## RED
- **Test file**: `server/src/generate/engine.service.spec.ts`
- **Assertion**:
  ```ts
  import type { Delta } from '../upload/extractor.service';

  describe('processDeltas', () => {
    it('writes state_mutation via graphService and returns identity_shift as flaggedForReEmbed', async () => {
      const mockGraph = {
        updateEntityState: jest.fn().mockResolvedValue({ id: 'e1', state: { hp: 80 } }),
      };
      const engine = new EngineService(mockGraph as any);
      const spec: UpdateSpec = { variables: { hp: { min: 0, max: 100 } } };
      const deltas: Delta[] = [
        { op: 'state_mutation', entityId: 'e1', patch: { hp: 80 } },
        { op: 'identity_shift', entityId: 'e2', patch: { archetype: 'Warrior' } },
      ];

      const result = await engine.processDeltas(deltas, spec);

      expect(mockGraph.updateEntityState).toHaveBeenCalledWith('e1', { hp: 80 });
      expect(mockGraph.updateEntityState).toHaveBeenCalledTimes(1);
      expect(result.flaggedForReEmbed).toHaveLength(1);
      expect(result.flaggedForReEmbed[0].entityId).toBe('e2');
    });
  });
  ```
- **Why it fails**: `EngineService` has no `processDeltas` method.

## GREEN
- **Smallest change**: Add `async processDeltas(deltas: Delta[], spec: UpdateSpec): Promise<{ flaggedForReEmbed: IdentityShiftDelta[] }>` to `EngineService` — call `this.classifyDeltas(deltas)`, then `await Promise.all(stateMutations.map(d => this.applyStateMutationDelta(d.entityId, d.patch, spec)))`, return `{ flaggedForReEmbed: identityShifts }`.
- **Files touched**: `server/src/generate/engine.service.ts`

## REFACTOR
none
