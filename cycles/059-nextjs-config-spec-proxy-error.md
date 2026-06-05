---
id: cycle-059
slug: nextjs-config-spec-proxy-error
status: done
source: "Config spec proxy error-path: non-OK upstream status (e.g. 401) is passed through unchanged"
covers: error-path
group: config-proxy
boundary-covered-by: cycle-057
---

## Dependencies
None beyond cycle-057 and cycle-058 — the production file `client/app/api/config/update-spec/route.ts` already exists with both handlers.

## Behavior

When the NestJS config endpoint returns a non-OK status (e.g. 401 Unauthorized when the JWT is missing or expired), both the `GET` and `PUT` proxy handlers must forward the upstream status code and error body without modification. `Response.json(data, { status: upstream.status })` already satisfies this; no new production code is required. This cycle adds a third `describe` block to the same test file to document and lock that behavior for both verbs.

## RED
- **Test file**: `client/__tests__/api/config/update-spec/route.test.ts`
- **Assertion**:
  ```ts
  import { GET, PUT } from '../../../../../app/api/config/update-spec/route'

  describe('GET /api/config/update-spec proxy — error path', () => {
    it('returns upstream 401 and error body when NestJS rejects the request', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
        status: 401,
      } as any)

      const req = new Request('http://localhost/api/config/update-spec', {
        headers: { Authorization: 'Bearer expired.token' },
      })
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ message: 'Unauthorized' })
    })
  })

  describe('PUT /api/config/update-spec proxy — error path', () => {
    it('returns upstream 401 and error body when NestJS rejects the request', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
        status: 401,
      } as any)

      const req = new Request('http://localhost/api/config/update-spec', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer expired.token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version: 1 }),
      })
      const res = await PUT(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data).toEqual({ message: 'Unauthorized' })
    })
  })
  ```
- **Why it fails**: These `describe` blocks do not yet exist in the test file; the assertions are missing. Once added, both tests pass immediately because production code already propagates `upstream.status`.

## GREEN
- **Smallest change**: Add both `describe` blocks above to `client/__tests__/api/config/update-spec/route.test.ts`. No changes to `client/app/api/config/update-spec/route.ts`.
- **Files touched**: `client/__tests__/api/config/update-spec/route.test.ts`

## REFACTOR
none
