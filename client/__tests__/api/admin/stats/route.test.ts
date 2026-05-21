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
