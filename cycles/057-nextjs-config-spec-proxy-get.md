---
id: cycle-057
slug: nextjs-config-spec-proxy-get
status: done
source: "No client/app/api/config/update-spec/route.ts — create GET proxy forwarding Authorization to NestJS GET /api/config/update-spec"
covers: happy-path
group: config-proxy
---

## Dependencies

fetch (built-in global in Node 18+ / Next.js route handlers)
```
-- GET http://localhost:3001/api/config/update-spec → spec JSON object
-- Authorization header forwarded verbatim from incoming request
-- Same proxy pattern as client/app/api/admin/stats/route.ts
```

## Behavior

Create `client/app/api/config/update-spec/route.ts` — a Next.js route handler that handles `GET` requests, extracts the `Authorization` header from the incoming request, forwards it to `http://localhost:3001/api/config/update-spec`, and returns the upstream response (status + JSON body). The PUT handler (cycle-058) and error-path (cycle-059) are siblings in the same file/group.

## RED
- **Test file**: `client/__tests__/api/config/update-spec/route.test.ts`
- **Assertion**:
  ```ts
  /**
   * @jest-environment node
   */
  import { GET } from '../../../../../app/api/config/update-spec/route'

  describe('GET /api/config/update-spec proxy — happy path', () => {
    it('forwards Authorization to NestJS and returns spec JSON with status 200', async () => {
      const mockSpec = { version: 1, actions: [] }
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockSpec),
        status: 200,
      } as any)

      const req = new Request('http://localhost/api/config/update-spec', {
        headers: { Authorization: 'Bearer test.token.here' },
      })
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(mockSpec)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/config/update-spec',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test.token.here' }),
        }),
      )
    })
  })
  ```
- **Why it fails**: `client/app/api/config/update-spec/route.ts` does not exist so the named export `GET` cannot be imported.

## GREEN
- **Smallest change**: Create `client/app/api/config/update-spec/route.ts`:
  ```ts
  export async function GET(request: Request) {
    const authorization = request.headers.get('Authorization') ?? ''
    const upstream = await fetch('http://localhost:3001/api/config/update-spec', {
      headers: { Authorization: authorization },
    })
    const data = await upstream.json()
    return Response.json(data, { status: upstream.status })
  }
  ```
- **Files touched**: `client/app/api/config/update-spec/route.ts`

## REFACTOR
none
