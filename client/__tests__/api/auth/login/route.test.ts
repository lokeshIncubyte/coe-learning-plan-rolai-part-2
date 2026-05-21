/**
 * @jest-environment node
 */
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
