---
id: cycle-053
slug: nextjs-admin-stats-proxy-error
status: done
source: "Admin page: Next.js API proxy error path — forwards 401/403 status from NestJS"
covers: error-path
group: admin-page
boundary-covered-by: cycle-052
---

## Dependencies

**(none — pure proxy pass-through)** boundary is covered by cycle-052.

## Behavior

When the NestJS upstream returns HTTP 401 (no token) or 403 (wrong role), the Next.js proxy route `GET /api/admin/stats` returns the same status code with the upstream JSON body. No additional production code is needed — the `Response.json(data, { status: upstream.status })` from cycle-052 already handles this.

## RED
- **Test file**: `client/__tests__/api/admin/stats/route.test.ts`
- **Note**: This test is added to the same file as cycle-052. The file must begin with `/** @jest-environment node */` (already placed there by cycle-052's RED). Do not omit that docblock when writing the combined file.
- **Assertion**:
  ```ts
  describe('GET /api/admin/stats proxy — error path', () => {
    it('returns 401 when upstream returns 401', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
        status: 401,
      } as any)

      const req = new Request('http://localhost/api/admin/stats', {
        headers: { Authorization: '' },
      })
      const res = await GET(req)

      expect(res.status).toBe(401)
    })

    it('returns 403 when upstream returns 403', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ message: 'Forbidden' }),
        status: 403,
      } as any)

      const req = new Request('http://localhost/api/admin/stats', {
        headers: { Authorization: 'Bearer user.token.here' },
      })
      const res = await GET(req)

      expect(res.status).toBe(403)
    })
  })
  ```
- **Why it fails**: `client/app/api/admin/stats/route.ts` does not exist yet (cycle-052 must run first).

## GREEN
- **Smallest change**: No additional production code — the proxy from cycle-052 passes `upstream.status` through via `Response.json(data, { status: upstream.status })`.
- **Files touched**: `client/__tests__/api/admin/stats/route.test.ts` (test only)

## REFACTOR
none
