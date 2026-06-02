---
id: cycle-052
slug: nextjs-admin-stats-proxy
status: done
source: "Admin page: Next.js API proxy route GET /api/admin/stats — forwards Authorization header to NestJS"
covers: happy-path
group: admin-page
---

## Dependencies

### Package
fetch (built-in global in Node 18+ / Next.js route handlers)
```
-- fetch(url, options): Promise<Response>
-- Response.json(): Promise<unknown>
-- Response.status: number
-- Authorization header forwarded verbatim from incoming request
-- Same pattern as client/app/api/auth/login/route.ts
```

## Behavior

Create `client/app/api/admin/stats/route.ts` — a Next.js route handler that handles `GET` requests, extracts the `Authorization` header from the incoming request, forwards it to `http://localhost:3001/api/admin/stats`, and returns the upstream response (status + JSON body). This is the same proxy pattern as `client/app/api/auth/login/route.ts`. The boundary is `fetch()` to the NestJS server; the error-path sibling is cycle-053.

## RED
- **Test file**: `client/__tests__/api/admin/stats/route.test.ts`
- **Assertion**:
  ```ts
  /**
   * @jest-environment node
   */
  import { GET } from '../../../../app/api/admin/stats/route'

  describe('GET /api/admin/stats proxy', () => {
    it('proxies to NestJS with Authorization header and returns stats on success', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ entityCount: 5, edgeCount: 3, sessionCount: 2, historyCount: 10, latestHistoryAt: null }),
        status: 200,
      } as any)

      const req = new Request('http://localhost/api/admin/stats', {
        headers: { Authorization: 'Bearer test.token.here' },
      })
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual({ entityCount: 5, edgeCount: 3, sessionCount: 2, historyCount: 10, latestHistoryAt: null })
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/admin/stats',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test.token.here' }) }),
      )
    })
  })
  ```
- **Why it fails**: `client/app/api/admin/stats/route.ts` does not exist.

## GREEN
- **Smallest change**: Create `client/app/api/admin/stats/route.ts`:
  ```ts
  export async function GET(request: Request) {
    const authorization = request.headers.get('Authorization') ?? ''
    const upstream = await fetch('http://localhost:3001/api/admin/stats', {
      headers: { Authorization: authorization },
    })
    const data = await upstream.json()
    return Response.json(data, { status: upstream.status })
  }
  ```
- **Files touched**: `client/app/api/admin/stats/route.ts`

## REFACTOR
none
