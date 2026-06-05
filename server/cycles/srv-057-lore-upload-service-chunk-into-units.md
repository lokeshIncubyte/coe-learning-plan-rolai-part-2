---
id: srv-057
slug: lore-upload-service-chunk-into-units
status: done
source: "`chunkIntoUnits(text)` — splits the document into entity-sized narrative chunks suitable for extraction"
covers: atomic
---

## Behavior
`LoreUploadService.chunkIntoUnits` splits a string on double-newlines (`\n\n`), trims each segment, and returns only non-empty segments. Single-newlines within a paragraph are preserved. An optional `maxChunkSize` (default 1500 chars) truncates segments that exceed the limit.

## RED
- **Test file**: `src/upload/lore-upload.service.spec.ts`
- **Assertion**:
  ```ts
  describe('chunkIntoUnits', () => {
    it('splits on double-newline, trims whitespace, filters empty segments', () => {
      const text = 'TestChar is a mage.\n\nThe tavern is dark.\n\n  \n\nA sword lies on the table.';
      const chunks = svc.chunkIntoUnits(text);
      expect(chunks).toEqual([
        'TestChar is a mage.',
        'The tavern is dark.',
        'A sword lies on the table.',
      ]);
    });

    it('preserves single newlines within a paragraph', () => {
      const text = 'Line one.\nLine two.\n\nParagraph two.';
      const chunks = svc.chunkIntoUnits(text);
      expect(chunks[0]).toBe('Line one.\nLine two.');
    });
  });
  ```
- **Why it fails**: `chunkIntoUnits` method does not exist on `LoreUploadService`.

## GREEN
- **Smallest change**: Add `chunkIntoUnits(text: string, maxChunkSize = 1500): string[]` that does `text.split('\n\n').map(s => s.trim()).filter(Boolean).map(s => s.slice(0, maxChunkSize))`.
- **Files touched**: `src/upload/lore-upload.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/lore-upload-service-chunk-into-units
git commit -m "feat(srv-057): <summary>"
git branch -D tdd/lore-upload-service-chunk-into-units
```
