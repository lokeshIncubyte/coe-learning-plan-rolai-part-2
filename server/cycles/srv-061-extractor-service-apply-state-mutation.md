---
id: srv-061
slug: extractor-service-apply-state-mutation
status: done
source: "`applyDeltas` — `state_mutation` deltas do not trigger re-embedding"
covers: happy-path
group: extractor-apply-deltas
---

## Behavior
`ExtractorService.applyDeltas` processes a `state_mutation` delta by calling `GraphService.updateEntityState(delta.entityId, delta.patch)`. Because `updateEntityState` calls `onEntityWrite` which checks `shouldReembed`, and state changes return false from `shouldReembed`, no embedding API call fires.

## RED
- **Test file**: `src/upload/extractor.service.spec.ts`
- **Assertion**:
  ```ts
  it('state_mutation: calls updateEntityState with entityId and patch', async () => {
    const mockGraph = { createEntity: jest.fn(), createEdge: jest.fn(), updateEntityState: jest.fn().mockResolvedValue({}) };
    const svc2 = new ExtractorService({} as any, mockGraph as any, {} as any);

    const delta: StateMutationDelta = { op: 'state_mutation', entityId: 'e2', patch: { hp: 80 } };
    await svc2.applyDeltas([delta]);

    expect(mockGraph.updateEntityState).toHaveBeenCalledWith('e2', { hp: 80 });
  });
  ```
- **Why it fails**: `applyDeltas` has no `state_mutation` branch.

## GREEN
- **Smallest change**: Add `state_mutation` case: `await this.graphService.updateEntityState(delta.entityId, delta.patch)`.
- **Files touched**: `src/upload/extractor.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/extractor-service-apply-state-mutation
git commit -m "feat(srv-061): <summary>"
git branch -D tdd/extractor-service-apply-state-mutation
```
