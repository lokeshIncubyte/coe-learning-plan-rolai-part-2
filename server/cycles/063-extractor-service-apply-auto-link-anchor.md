---
id: cycle-063
slug: extractor-service-apply-auto-link-anchor
status: done
source: "Auto-link new entities to the current anchor entity in the graph (create `new_edge` delta automatically)"
covers: happy-path
group: extractor-apply-deltas
---

## Behavior
When `applyDeltas` is called with a non-null `anchorId`, every `new_entity` delta additionally creates an edge from `anchorId` to the newly created entity with type `'contains'`. This auto-link happens regardless of whether an explicit `new_edge` delta also exists.

## RED
- **Test file**: `src/upload/extractor.service.spec.ts`
- **Assertion**:
  ```ts
  it('new_entity with anchorId: creates edge from anchor to new entity', async () => {
    const mockGraph = {
      createEntity: jest.fn().mockResolvedValue({ id: 'newE' }),
      createEdge: jest.fn().mockResolvedValue({}),
    };
    const mockEmbed = { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) };
    const svc2 = new ExtractorService({} as any, mockGraph as any, mockEmbed as any);

    const delta: NewEntityDelta = { op: 'new_entity', identity: { name: 'Tavern', type: 'location' }, state: {} };
    await svc2.applyDeltas([delta], 'anchor-1');

    expect(mockGraph.createEdge).toHaveBeenCalledWith(expect.objectContaining({
      fromId: 'anchor-1',
      toId: 'newE',
      type: 'contains',
    }));
  });
  ```
- **Why it fails**: `applyDeltas` does not create an auto-link edge.

## GREEN
- **Smallest change**: Inside the `new_entity` branch, after creating the entity, if `anchorId` is provided: `await this.graphService.createEdge({ fromId: anchorId, toId: created.id, type: 'contains', weight: 1.0, tags: [] })`.
- **Files touched**: `src/upload/extractor.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/extractor-service-apply-auto-link-anchor
git commit -m "feat(cycle-063): <summary>"
git branch -D tdd/extractor-service-apply-auto-link-anchor
```
