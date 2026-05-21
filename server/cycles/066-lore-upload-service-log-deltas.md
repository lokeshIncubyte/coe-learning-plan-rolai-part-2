---
id: cycle-066
slug: lore-upload-service-log-deltas
status: done
source: "Log all deltas to `GenerationHistory` with their `op` category"
covers: happy-path
group: lore-upload-extract-and-persist
---

## Behavior
After applying all deltas for a chunk, `extractAndPersist` calls `GenerationHistoryService.logUploadDeltas(chunkIndex, deltas)` — a new method that persists the applied delta batch (with each delta's `op` category) to `GenerationHistory` for auditability.

## RED
- **Test file**: `src/upload/lore-upload.service.spec.ts`
- **Assertion**:
  ```ts
  it('logs all applied deltas to GenerationHistoryService after each chunk', async () => {
    const deltas = [{ op: 'new_entity', identity: { name: 'X', type: 'character' }, state: {} }];
    const mockExtractor = {
      extractDeltas: jest.fn().mockResolvedValue(deltas),
      applyDeltas: jest.fn().mockResolvedValue({ entityCount: 1, edgeCount: 0 }),
    };
    const mockHistory = { logUploadDeltas: jest.fn().mockResolvedValue(undefined) };
    const svc2 = new LoreUploadService(mockExtractor as any, mockHistory as any);

    await svc2.extractAndPersist(['one chunk']);

    expect(mockHistory.logUploadDeltas).toHaveBeenCalledWith(0, deltas);
  });
  ```
- **Why it fails**: `extractAndPersist` does not call `logUploadDeltas`.

## GREEN
- **Smallest change**: After `applyDeltas` in the loop, call `await this.historyService.logUploadDeltas(chunkIndex, extractedDeltas)`. Add `logUploadDeltas(chunkIndex: number, deltas: object[]): Promise<void>` to `GenerationHistoryService` — it creates a Session, then calls `prisma.generationHistory.create` with `narrative: 'upload'`, `anchor: String(chunkIndex)`, and `deltas`.
- **Files touched**: `src/upload/lore-upload.service.ts`, `src/history/generation-history.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/lore-upload-service-log-deltas
git commit -m "feat(cycle-066): <summary>"
git branch -D tdd/lore-upload-service-log-deltas
```
