---
id: srv-065
slug: lore-upload-service-extract-and-persist
status: done
source: "`extractAndPersist(chunks)` — calls `ExtractorService` on each chunk, writes results to the graph layer"
covers: happy-path
group: lore-upload-extract-and-persist
---

## Behavior
`LoreUploadService.extractAndPersist` iterates over an array of text chunks, calls `ExtractorService.extractDeltas` on each, then `ExtractorService.applyDeltas`, and returns the aggregate `{ entityCount, edgeCount, chunkCount }`.

## RED
- **Test file**: `src/upload/lore-upload.service.spec.ts`
- **Assertion**:
  ```ts
  describe('extractAndPersist', () => {
    it('calls extractDeltas + applyDeltas per chunk and returns aggregate counts', async () => {
      const mockExtractor = {
        extractDeltas: jest.fn().mockResolvedValue([{ op: 'new_entity', identity: { name: 'X', type: 'character' }, state: {} }]),
        applyDeltas: jest.fn().mockResolvedValue({ entityCount: 1, edgeCount: 0 }),
      };
      const mockHistory = { logUploadDeltas: jest.fn().mockResolvedValue(undefined) };
      const svc2 = new LoreUploadService(mockExtractor as any, mockHistory as any);

      const result = await svc2.extractAndPersist(['chunk one', 'chunk two']);

      expect(mockExtractor.extractDeltas).toHaveBeenCalledTimes(2);
      expect(mockExtractor.applyDeltas).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ entityCount: 2, edgeCount: 0, chunkCount: 2 });
    });
  });
  ```
- **Why it fails**: `extractAndPersist` does not exist on `LoreUploadService`.

## GREEN
- **Smallest change**: Add `async extractAndPersist(chunks: string[], anchorId?: string): Promise<{ entityCount: number; edgeCount: number; chunkCount: number }>` to `LoreUploadService`. Constructor gains `ExtractorService` and `GenerationHistoryService` dependencies. Loop over chunks: call `extractDeltas`, then `applyDeltas`. Accumulate counts.
- **Files touched**: `src/upload/lore-upload.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/lore-upload-service-extract-and-persist
git commit -m "feat(srv-065): <summary>"
git branch -D tdd/lore-upload-service-extract-and-persist
```
