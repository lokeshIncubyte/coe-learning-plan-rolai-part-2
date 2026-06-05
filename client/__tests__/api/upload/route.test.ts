/**
 * @jest-environment node
 */
import { POST } from '../../../app/api/upload/route'

describe('POST /api/upload proxy — happy path', () => {
  it('forwards Authorization and Content-Type to NestJS and returns entityCount/edgeCount', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ entityCount: 3, edgeCount: 2 }),
      status: 200,
    } as any)

    const body = new Uint8Array([1, 2, 3]).buffer
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test.token.here',
        'Content-Type': 'multipart/form-data; boundary=----boundary123',
      },
      body: body,
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ entityCount: 3, edgeCount: 2 })
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/upload',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test.token.here',
          'Content-Type': 'multipart/form-data; boundary=----boundary123',
        }),
      }),
    )
  })
})

describe('POST /api/upload proxy — error path', () => {
  it('returns upstream 400 and error body when NestJS rejects the file', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ message: 'Unsupported file type' }),
      status: 400,
    } as any)

    const body = new Uint8Array([1, 2, 3]).buffer
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test.token.here',
        'Content-Type': 'multipart/form-data; boundary=----boundary123',
      },
      body: body,
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data).toEqual({ message: 'Unsupported file type' })
  })
})
