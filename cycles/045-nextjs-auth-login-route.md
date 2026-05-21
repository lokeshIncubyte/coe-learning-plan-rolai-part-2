---
id: cycle-045
slug: nextjs-auth-login-route
status: pending
source: "Next.js login page at /login — POST to /api/auth/login (Next.js proxy route to NestJS)"
covers: happy-path
group: next-auth
---

## Dependencies

### Package
fetch (built-in, global in Next.js route handlers)
```
-- fetch(url, options): Promise<Response>
-- Response.json(): Promise<unknown>
-- Response.status: number
-- Used same as existing client/app/api/generate/route.ts pattern
```

## Behavior
Create Next.js route handler at `client/app/api/auth/login/route.ts` that proxies `POST` requests to `http://localhost:3001/api/auth/login` and returns the upstream response (status + JSON body). Same proxy pattern as the existing `/api/generate` route.

## RED
- **Test file**: `client/__tests__/api/auth/login/route.test.ts`
- **Assertion**:
  ```ts
  import { POST } from '../../../../app/api/auth/login/route'

  describe('POST /api/auth/login proxy', () => {
    it('proxies to NestJS and returns accessToken on success', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ accessToken: 'token.jwt.string' }),
        status: 200,
      } as any)

      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@platform.com', password: 'login' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)
      const data = await res.json()

      expect(data).toEqual({ accessToken: 'token.jwt.string' })
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/login',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
  ```
- **Why it fails**: `client/app/api/auth/login/route.ts` does not exist.

## GREEN
- **Smallest change**: Create `client/app/api/auth/login/route.ts`:
  ```ts
  export async function POST(request: Request) {
    const body = await request.json()
    const upstream = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await upstream.json()
    return Response.json(data, { status: upstream.status })
  }
  ```
- **Files touched**: `client/app/api/auth/login/route.ts`

## REFACTOR
none
