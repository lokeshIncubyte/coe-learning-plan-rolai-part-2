---
id: cycle-060
slug: extractor-service-apply-identity-shift
status: done
source: "`applyDeltas` — `identity_shift` deltas fire `onEntityWrite` hook"
covers: happy-path
group: extractor-apply-deltas
---

## Behavior
`ExtractorService.applyDeltas` processes an `identity_shift` delta by calling `GraphService.updateEntityIdentity(delta.entityId, delta.patch)`. This fires the existing `onEntityWrite` hook inside `GraphService`, which triggers re-embedding when identity fields change.

## RED
- **Test file**: `src/upload/extractor.service.spec.ts`
- **Assertion**:
  ```ts
  it('identity_shift: calls updateEntityIdentity with entityId and patch', async () => {
    const mockGraph = { createEntity: jest.fn(), createEdge: jest.fn(), updateEntityIdentity: jest.fn().mockResolvedValue({}) };
    const svc2 = new ExtractorService({} as any, mockGraph as any, {} as any);

    const delta: IdentityShiftDelta = { op: 'identity_shift', entityId: 'e1', patch: { archetype: 'Warrior' } };
    await svc2.applyDeltas([delta]);

    expect(mockGraph.updateEntityIdentity).toHaveBeenCalledWith('e1', { archetype: 'Warrior' });
  });
  ```
- **Why it fails**: `applyDeltas` has no `identity_shift` branch.

## GREEN
- **Smallest change**: Add `identity_shift` case to `applyDeltas`: `await this.graphService.updateEntityIdentity(delta.entityId, delta.patch)`.
- **Files touched**: `src/upload/extractor.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/extractor-service-apply-identity-shift
git commit -m "feat(cycle-060): <summary>"
git branch -D tdd/extractor-service-apply-identity-shift
```
