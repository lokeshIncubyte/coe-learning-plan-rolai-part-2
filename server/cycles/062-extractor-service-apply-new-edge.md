---
id: cycle-062
slug: extractor-service-apply-new-edge
status: done
source: "`applyDeltas` — `new_edge` delta creates directed relationship"
covers: happy-path
group: extractor-apply-deltas
---

## Behavior
`ExtractorService.applyDeltas` processes a `new_edge` delta by calling `GraphService.createEdge` with `{ fromId, toId, type, weight, tags }` from the delta. Increments `edgeCount` in the return value.

## RED
- **Test file**: `src/upload/extractor.service.spec.ts`
- **Assertion**:
  ```ts
  it('new_edge: calls createEdge and increments edgeCount', async () => {
    const mockGraph = { createEntity: jest.fn(), createEdge: jest.fn().mockResolvedValue({ id: 'edge1' }), updateEntityState: jest.fn() };
    const svc2 = new ExtractorService({} as any, mockGraph as any, {} as any);

    const delta: NewEdgeDelta = { op: 'new_edge', fromId: 'e1', toId: 'e2', type: 'ally', weight: 1.0, tags: [] };
    const result = await svc2.applyDeltas([delta]);

    expect(mockGraph.createEdge).toHaveBeenCalledWith({ fromId: 'e1', toId: 'e2', type: 'ally', weight: 1.0, tags: [] });
    expect(result.edgeCount).toBe(1);
  });
  ```
- **Why it fails**: `applyDeltas` has no `new_edge` branch.

## GREEN
- **Smallest change**: Add `new_edge` case: `await this.graphService.createEdge({ fromId: delta.fromId, toId: delta.toId, type: delta.type, weight: delta.weight ?? 1.0, tags: delta.tags ?? [] })`. Increment `edgeCount`.
- **Files touched**: `src/upload/extractor.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/extractor-service-apply-new-edge
git commit -m "feat(cycle-062): <summary>"
git branch -D tdd/extractor-service-apply-new-edge
```
