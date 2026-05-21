---
id: cycle-046
slug: nextjs-auth-login-route-error
status: done
source: "Next.js /api/auth/login proxy — returns 401 when upstream NestJS returns 401"
covers: error-path
group: next-auth
---

## Dependencies

### Package
fetch (built-in)
```
-- upstream returns { status: 401, json: () => { message: 'Unauthorized' } }
-- Response.json(data, { status: 401 }) preserves upstream status
```

## Behavior
When the NestJS upstream returns HTTP 401 (invalid credentials), the Next.js proxy route returns HTTP 401 to the client with the upstream JSON body intact.

## RED
- **Test file**: `client/__tests__/api/auth/login/route.test.ts`
- **Assertion**:
  ```ts
  import { POST } from '../../../../app/api/auth/login/route'

  describe('POST /api/auth/login proxy — error path', () => {
    it('returns 401 when upstream returns 401', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
        status: 401,
      } as any)

      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'bad@example.com', password: 'wrong' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)

      expect(res.status).toBe(401)
    })
  })
  ```
- **Why it fails**: `client/app/api/auth/login/route.ts` does not exist yet (cycle-045 must be done first).

## GREEN
- **Smallest change**: No additional production code — the proxy from cycle-045 passes `upstream.status` through to `Response.json(data, { status: upstream.status })`, so 401 is already forwarded.
- **Files touched**: `client/__tests__/api/auth/login/route.test.ts` (test only)

## REFACTOR
none
