---
id: srv-064
slug: extractor-service-apply-citation
status: done
source: "Citation tracking — persist source chunk reference on each created entity for auditability"
covers: atomic
---

## Behavior
When a `new_entity` delta includes a `source` string, `applyDeltas` merges `{ source: delta.source }` into the `facts` field of the entity passed to `GraphService.createEntity`. This preserves the originating chunk text for auditability.

## RED
- **Test file**: `src/upload/extractor.service.spec.ts`
- **Assertion**:
  ```ts
  it('new_entity with source: includes source in entity facts', async () => {
    const mockGraph = {
      createEntity: jest.fn().mockResolvedValue({ id: 'e3' }),
      createEdge: jest.fn(),
    };
    const mockEmbed = { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) };
    const svc2 = new ExtractorService({} as any, mockGraph as any, mockEmbed as any);

    const delta: NewEntityDelta = {
      op: 'new_entity',
      identity: { name: 'Mira', type: 'character' },
      state: {},
      source: 'Mira is an ancient mage who guards the northern pass.',
    };
    await svc2.applyDeltas([delta]);

    expect(mockGraph.createEntity).toHaveBeenCalledWith(expect.objectContaining({
      facts: expect.objectContaining({ source: 'Mira is an ancient mage who guards the northern pass.' }),
    }));
  });
  ```
- **Why it fails**: `applyDeltas` does not pass `facts.source` to `createEntity`.

## GREEN
- **Smallest change**: In the `new_entity` branch, pass `facts: { ...(delta.facts ?? {}), ...(delta.source ? { source: delta.source } : {}) }` when calling `createEntity`.
- **Files touched**: `src/upload/extractor.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/extractor-service-apply-citation
git commit -m "feat(srv-064): <summary>"
git branch -D tdd/extractor-service-apply-citation
```
