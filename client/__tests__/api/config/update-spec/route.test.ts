/**
 * @jest-environment node
 */
import { GET, PUT } from '../../../../app/api/config/update-spec/route'

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

describe('PUT /api/config/update-spec proxy — happy path', () => {
  it('forwards Authorization and JSON body to NestJS and returns 200 (NestJS returns void)', async () => {
    const updatedSpec = { version: 2, actions: ['jump'] }
    // NestJS updateSpec returns void — empty body. Proxy must not call json() on empty input.
    global.fetch = jest.fn().mockResolvedValue({
      text: jest.fn().mockResolvedValue(''),
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
    expect(data).toEqual({})  // empty body from NestJS void return → proxy returns {}
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
      text: jest.fn().mockResolvedValue('{"message":"Unauthorized"}'),
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
