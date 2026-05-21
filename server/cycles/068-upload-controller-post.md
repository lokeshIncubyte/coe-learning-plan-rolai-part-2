---
id: cycle-068
slug: upload-controller-post
status: done
source: "Create `POST /api/upload` endpoint in NestJS — accepts multipart file upload; Return extracted text or a processing receipt to the caller"
covers: happy-path
---

## Behavior
`UploadController` exposes `POST /api/upload` decorated with `@UseInterceptors(FileInterceptor('file'))`. It calls `loreUploadService.processUpload(file.buffer, file.mimetype)`, then `chunkIntoUnits(text)`, then `extractAndPersist(chunks)`, and returns `{ entityCount, edgeCount, chunkCount }`.

## RED
- **Test file**: `src/upload/upload.controller.spec.ts`
- **Assertion**:
  ```ts
  import { UploadController } from './upload.controller';

  describe('UploadController', () => {
    it('POST upload: processes file and returns summary', async () => {
      const mockSvc = {
        processUpload: jest.fn().mockResolvedValue('some text'),
        chunkIntoUnits: jest.fn().mockReturnValue(['chunk1']),
        extractAndPersist: jest.fn().mockResolvedValue({ entityCount: 1, edgeCount: 0, chunkCount: 1 }),
      };
      const ctrl = new UploadController(mockSvc as any);
      const file = { buffer: Buffer.from('some text'), mimetype: 'text/plain' } as Express.Multer.File;

      const result = await ctrl.upload(file);

      expect(mockSvc.processUpload).toHaveBeenCalledWith(file.buffer, file.mimetype);
      expect(result).toEqual({ entityCount: 1, edgeCount: 0, chunkCount: 1 });
    });
  });
  ```
- **Why it fails**: `UploadController` does not exist.

## GREEN
- **Smallest change**: Create `src/upload/upload.controller.ts` with `@Controller('upload')` and `@Post()` method `upload(@UploadedFile() file: Express.Multer.File)`. Create `src/upload/upload.module.ts` registering `UploadController` and `LoreUploadService`. Import `MulterModule` for multipart.
- **Files touched**: `src/upload/upload.controller.ts`, `src/upload/upload.module.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/upload-controller-post
git commit -m "feat(cycle-068): <summary>"
git branch -D tdd/upload-controller-post
```
