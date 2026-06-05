---
id: cycle-058
slug: nextjs-config-spec-proxy-put
status: done
source: "Config spec proxy: add PUT handler to forward JSON body and Authorization to NestJS PUT /api/config/update-spec"
covers: happy-path
group: config-proxy
boundary-covered-by: cycle-057
---

## Dependencies
`client/app/api/config/update-spec/route.ts` must exist (created in cycle-057 GREEN).

## Behavior

Add a `PUT` handler to `client/app/api/config/update-spec/route.ts`. The handler reads the `Authorization` header and the request body as JSON, re-serializes it, and forwards it to `http://localhost:3001/api/config/update-spec` with `Content-Type: application/json`. Returns the upstream response status and JSON body. The error-path (401 pass-through) is cycle-059.

## RED
- **Test file**: `client/__tests__/api/config/update-spec/route.test.ts`
- **Assertion**:
  ```ts
  import { PUT } from '../../../../../app/api/config/update-spec/route'

  describe('PUT /api/config/update-spec proxy — happy path', () => {
    it('forwards Authorization and JSON body to NestJS and returns saved spec with status 200', async () => {
      const updatedSpec = { version: 2, actions: ['jump'] }
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(updatedSpec),
        status: 200,
      } as any)

      const req = new Request('http://localhost/api/config/update-spec', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer test.token.here',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSpec),
      })

      const res = await PUT(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(updatedSpec)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/config/update-spec',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test.token.here',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(updatedSpec),
        }),
      )
    })
  })
  ```
- **Why it fails**: `client/app/api/config/update-spec/route.ts` has no `PUT` export after cycle-057 GREEN, so the import is `undefined` and calling it throws.

## GREEN
- **Smallest change**: Add `PUT` handler to `client/app/api/config/update-spec/route.ts`:
  ```ts
  export async function PUT(request: Request) {
    const authorization = request.headers.get('Authorization') ?? ''
    const body = await request.json()
    const upstream = await fetch('http://localhost:3001/api/config/update-spec', {
      method: 'PUT',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await upstream.json()
    return Response.json(data, { status: upstream.status })
  }
  ```
- **Files touched**: `client/app/api/config/update-spec/route.ts`

## REFACTOR
none
