---
id: cycle-055
slug: nextjs-upload-proxy
status: done
source: "No client/app/api/upload/route.ts — create POST proxy that forwards multipart FormData and Authorization header to NestJS /api/upload"
covers: happy-path
group: upload-proxy
---

## Dependencies

fetch (built-in global in Node 18+ / Next.js route handlers)
```
-- POST http://localhost:3001/api/upload — multipart body → { entityCount: number, edgeCount: number }
-- Authorization header forwarded verbatim from incoming request
-- Content-Type forwarded verbatim so NestJS can parse multipart boundary
```

## Behavior

Create `client/app/api/upload/route.ts` — a Next.js route handler that handles `POST` requests, extracts the `Authorization` header and `Content-Type` header from the incoming request, reads the request body as an `ArrayBuffer`, and forwards both to `http://localhost:3001/api/upload`. Returns the upstream response status and JSON body to the caller. The multipart boundary is preserved because the `Content-Type` header (including the boundary parameter) is forwarded verbatim. The error-path sibling is cycle-056.

## RED
- **Test file**: `client/__tests__/api/upload/route.test.ts`
- **Assertion**:
  ```ts
  /**
   * @jest-environment node
   */
  import { POST } from '../../../../app/api/upload/route'

  describe('POST /api/upload proxy — happy path', () => {
    it('forwards Authorization and Content-Type to NestJS and returns entityCount/edgeCount', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ entityCount: 3, edgeCount: 2 }),
        status: 200,
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

      expect(res.status).toBe(200)
      expect(data).toEqual({ entityCount: 3, edgeCount: 2 })
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/upload',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test.token.here',
            'Content-Type': 'multipart/form-data; boundary=----boundary123',
          }),
        }),
      )
    })
  })
  ```
- **Why it fails**: `client/app/api/upload/route.ts` does not exist so the named export `POST` cannot be imported.

## GREEN
- **Smallest change**: Create `client/app/api/upload/route.ts`:
  ```ts
  export async function POST(request: Request) {
    const authorization = request.headers.get('Authorization') ?? ''
    const contentType = request.headers.get('Content-Type') ?? ''
    const body = await request.arrayBuffer()
    const upstream = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': contentType,
      },
      body,
    })
    const data = await upstream.json()
    return Response.json(data, { status: upstream.status })
  }
  ```
- **Files touched**: `client/app/api/upload/route.ts`

## REFACTOR
none
