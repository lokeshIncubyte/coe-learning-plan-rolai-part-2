---
id: cycle-056
slug: nextjs-upload-proxy-error
status: done
source: "Upload proxy error-path: upstream 400 (unsupported file type) is passed through unchanged"
covers: error-path
group: upload-proxy
boundary-covered-by: cycle-055
---

## Dependencies
None beyond cycle-055 — the production file `client/app/api/upload/route.ts` already exists after cycle-055 GREEN.

## Behavior

When the NestJS upload endpoint rejects the file (e.g. unsupported type, returns HTTP 400 with an error body), the Next.js proxy must forward the upstream status code and error body without modification. `Response.json(data, { status: upstream.status })` in the GREEN from cycle-055 already satisfies this; no new production code is required. This cycle adds a second `describe` block to the same test file to document and lock that behavior.

## RED
- **Test file**: `client/__tests__/api/upload/route.test.ts`
- **Assertion**:
  ```ts
  describe('POST /api/upload proxy — error path', () => {
    it('returns upstream 400 and error body when NestJS rejects the file', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ message: 'Unsupported file type' }),
        status: 400,
      } as any)

      const body = new Uint8Array([1, 2, 3]).buffer
      const req = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test.token.here',
          'Content-Type': 'multipart/form-data; boundary=----boundary123',
        },
        body: body,
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data).toEqual({ message: 'Unsupported file type' })
    })
  })
  ```
- **Why it fails**: The test file does not yet contain this `describe` block, so the assertion is missing. Once the block is added the test passes immediately because the production code already propagates `upstream.status`.

## GREEN
- **Smallest change**: Add the `describe` block above to `client/__tests__/api/upload/route.test.ts`. No changes to `client/app/api/upload/route.ts`.
- **Files touched**: `client/__tests__/api/upload/route.test.ts`

## REFACTOR
none
