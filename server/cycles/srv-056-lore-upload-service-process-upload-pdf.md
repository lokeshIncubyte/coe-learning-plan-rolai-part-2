---
id: srv-056
slug: lore-upload-service-process-upload-pdf
status: done
source: "Support PDF and plain text file types; Extract raw text from PDF using a Node.js PDF library (e.g. `pdf-parse`)"
covers: happy-path
group: lore-upload-process-upload
---

## Behavior
`LoreUploadService.processUpload` with `mimeType: 'application/pdf'` calls the `pdf-parse` library on the buffer and returns the extracted `text` string from the parsed result.

## RED
- **Test file**: `src/upload/lore-upload.service.spec.ts`
- **Assertion**:
  ```ts
  jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'extracted pdf text' }));
  import pdfParse from 'pdf-parse';

  // inside the existing describe block:
  it('extracts text from PDF buffer via pdf-parse', async () => {
    const buf = Buffer.from('%PDF-fake');
    const result = await svc.processUpload(buf, 'application/pdf');
    expect(pdfParse).toHaveBeenCalledWith(buf);
    expect(result).toBe('extracted pdf text');
  });
  ```
- **Why it fails**: `processUpload` has no PDF branch.

## GREEN
- **Smallest change**: Add `import pdfParse from 'pdf-parse';` and an `else if (mimeType === 'application/pdf')` branch that calls `const { text } = await pdfParse(buffer); return text;`.
- **Files touched**: `src/upload/lore-upload.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/lore-upload-service-process-upload-pdf
git commit -m "feat(srv-056): <summary>"
git branch -D tdd/lore-upload-service-process-upload-pdf
```
