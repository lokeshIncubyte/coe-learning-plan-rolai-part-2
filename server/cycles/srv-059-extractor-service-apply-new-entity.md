---
id: srv-059
slug: extractor-service-apply-new-entity
status: done
source: "`applyDeltas(deltas)` — writes each delta to the graph layer via `GraphService`; `new_entity` creates entity and triggers embedding"
covers: happy-path
group: extractor-apply-deltas
---

## Behavior
`ExtractorService.applyDeltas` processes a `new_entity` delta by calling `GraphService.createEntity` with the identity and state fields, then calling `EmbeddingService.embedEntityIdentity` on the newly created entity's ID. Returns an object `{ entityCount, edgeCount }`.

## RED
- **Test file**: `src/upload/extractor.service.spec.ts`
- **Assertion**:
  ```ts
  describe('applyDeltas', () => {
    it('new_entity: calls createEntity then embedEntityIdentity', async () => {
      const mockGraph = { createEntity: jest.fn().mockResolvedValue({ id: 'e1' }), createEdge: jest.fn() };
      const mockEmbed = { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) };
      const svc2 = new ExtractorService({} as any, mockGraph as any, mockEmbed as any);

      const delta: NewEntityDelta = { op: 'new_entity', identity: { name: 'Elara', type: 'character' }, state: {} };
      const result = await svc2.applyDeltas([delta]);

      expect(mockGraph.createEntity).toHaveBeenCalledWith(expect.objectContaining({ name: 'Elara', type: 'character' }));
      expect(mockEmbed.embedEntityIdentity).toHaveBeenCalledWith('e1');
      expect(result.entityCount).toBe(1);
    });
  });
  ```
- **Why it fails**: `applyDeltas` does not exist on `ExtractorService`.

## GREEN
- **Smallest change**: Add `async applyDeltas(deltas: Delta[], anchorId?: string): Promise<{ entityCount: number; edgeCount: number }>` to `ExtractorService`. Constructor gains a third optional parameter `embeddingService: EmbeddingService`. For `new_entity`: call `graphService.createEntity({ ...delta.identity, state: delta.state ?? {} })` then `embeddingService.embedEntityIdentity(created.id)`.
- **Files touched**: `src/upload/extractor.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/extractor-service-apply-new-entity
git commit -m "feat(srv-059): <summary>"
git branch -D tdd/extractor-service-apply-new-entity
```
