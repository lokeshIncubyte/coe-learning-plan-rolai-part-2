---
id: cycle-017
slug: engine-process-deltas-persist-identity-patch
status: done
source: "EngineService.processDeltas must persist identity_shift patches — patch is classified but never written to entity identity columns"
covers: atomic
---

## Dependencies

**(none — pure logic cycle)**

## Behavior
`processDeltas` currently classifies identity_shift deltas and returns them as `flaggedForReEmbed`, but never writes the patch (e.g. `{ archetype: 'Lich' }`) to the entity's identity columns. After this cycle, `processDeltas` also calls `graphService.updateEntityIdentity(d.entityId, d.patch)` for each identity_shift delta, in parallel with the state-mutation writes. `graphService.updateEntityIdentity` writes the patch to the entity's identity columns and triggers re-embedding via `onEntityWrite` — so the identity columns are now durably persisted before the response is returned.

## RED

- **Test file**: `src/generate/engine.service.spec.ts`
- **Assertion**:
  ```ts
  describe('processDeltas — identity_shift persistence', () => {
    it('calls graphService.updateEntityIdentity for each identity_shift delta', async () => {
      const updateEntityIdentity = jest.fn().mockResolvedValue({});
      const mockGraph = {
        updateEntityState: jest.fn().mockResolvedValue({}),
        updateEntityIdentity,
      };
      const engine = new EngineService(mockGraph as any);
      const pdSpec: UpdateSpec = { variables: { hp: { min: 0, max: 100 } } };
      const deltas: Delta[] = [
        { op: 'identity_shift', entityId: 'e3', patch: { archetype: 'Lich', role: 'villain' } },
      ];

      await engine.processDeltas(deltas, pdSpec);

      expect(updateEntityIdentity).toHaveBeenCalledWith('e3', { archetype: 'Lich', role: 'villain' });
    });
  });
  ```
- **Why it fails**: `processDeltas` never calls `graphService.updateEntityIdentity` — the mock is never invoked, so the `toHaveBeenCalledWith` assertion fails.

## GREEN

- **Smallest change**: In `processDeltas`, extend the `Promise.all` to also map `identityShifts` through `this.graphService.updateEntityIdentity(d.entityId, d.patch)`. Also add `updateEntityIdentity: jest.fn().mockResolvedValue({})` to the mockGraph in the existing `processDeltas` test (without `updateEntityIdentity` in scope, calling the updated `processDeltas` with an identity_shift will throw `TypeError: this.graphService.updateEntityIdentity is not a function`).
- **Files touched**: `src/generate/engine.service.ts`, `src/generate/engine.service.spec.ts`

## REFACTOR
none
