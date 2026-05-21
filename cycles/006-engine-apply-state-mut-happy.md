---
id: cycle-006
slug: engine-apply-state-mut-happy
status: done
source: "Day 9: EngineService applies state_mutation deltas — clamp then write to graph layer"
covers: happy-path
group: engine-apply-delta
---

## Dependencies

### Prisma
Model: Entity
Required fields (no `?`, no default): `type: string`, `name: string`
FK constraints: none on the state update path
Unique constraints: `id` (cuid default)
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
`graphService.updateEntityState` is mocked in this cycle; the Prisma boundary is covered by the error-path sibling cycle-007.

## Behavior
`EngineService.applyStateMutationDelta(entityId, patch, spec)` runs: clamp the patch via `clampPatch`, then call `graphService.updateEntityState(entityId, clampedPatch)`, and return `{ resolved: clampedPatch }`. Embeddings are never touched. This is the primary write path for the graph (hot) layer.

## RED
- **Test file**: `server/src/generate/engine.service.spec.ts`
- **Assertion**:
  ```ts
  describe('applyStateMutationDelta', () => {
    it('clamps patch and writes clamped values to graphService.updateEntityState', async () => {
      const mockGraph = {
        updateEntityState: jest.fn().mockResolvedValue({ id: 'e1', state: { hp: 100 } }),
      };
      const engine = new EngineService(mockGraph as any);
      const spec: UpdateSpec = { variables: { hp: { min: 0, max: 100 } } };

      const result = await engine.applyStateMutationDelta('e1', { hp: 150 }, spec);

      expect(mockGraph.updateEntityState).toHaveBeenCalledWith('e1', { hp: 100 });
      expect(result).toEqual({ resolved: { hp: 100 } });
    });
  });
  ```
- **Why it fails**: `EngineService` has no `applyStateMutationDelta` method.

## GREEN
- **Smallest change**: Add `async applyStateMutationDelta(entityId: string, patch: Record<string, unknown>, spec: UpdateSpec): Promise<{ resolved: Record<string, unknown> }>` to `EngineService` — call `this.clampPatch(patch, spec)`, then `await this.graphService.updateEntityState(entityId, clamped)`, return `{ resolved: clamped }`.
- **Files touched**: `server/src/generate/engine.service.ts`

## REFACTOR
none
