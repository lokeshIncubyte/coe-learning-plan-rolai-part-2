---
id: srv-055
slug: lore-upload-service-process-upload-text
status: done
source: "`processUpload(fileBuffer, mimeType)` — extracts raw text from the uploaded file"
covers: happy-path
group: lore-upload-process-upload
---

## Behavior
`LoreUploadService.processUpload` receives a `Buffer` and `mimeType: 'text/plain'` and returns the buffer content decoded as a UTF-8 string. No third-party library needed for plain text.

## RED
- **Test file**: `src/upload/lore-upload.service.spec.ts`
- **Assertion**:
  ```ts
  import { LoreUploadService } from './lore-upload.service';

  describe('LoreUploadService', () => {
    let svc: LoreUploadService;
    beforeEach(() => { svc = new LoreUploadService({} as any, {} as any); });

    describe('processUpload', () => {
      it('returns buffer content as UTF-8 string for text/plain', async () => {
        const result = await svc.processUpload(Buffer.from('hello world'), 'text/plain');
        expect(result).toBe('hello world');
      });
    });
  });
  ```
- **Why it fails**: `LoreUploadService` does not exist.

## GREEN
- **Smallest change**: Create `src/upload/lore-upload.service.ts` with `@Injectable()` class `LoreUploadService` that has `async processUpload(buffer: Buffer, mimeType: string): Promise<string>` — for `text/plain`, returns `buffer.toString('utf-8')`.
- **Files touched**: `src/upload/lore-upload.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/lore-upload-service-process-upload-text
git commit -m "feat(srv-055): <summary>"
git branch -D tdd/lore-upload-service-process-upload-text
```
