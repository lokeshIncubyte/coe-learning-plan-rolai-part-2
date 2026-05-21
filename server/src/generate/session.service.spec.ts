import { SessionService } from './session.service'

describe('SessionService', () => {
  it('createSession returns the new session id', async () => {
    const mockPrisma = {
      session: { create: jest.fn().mockResolvedValue({ id: 'sess-abc', createdAt: new Date() }) },
    }
    const service = new SessionService(mockPrisma as any)
    const id = await service.createSession()
    expect(id).toBe('sess-abc')
    expect(mockPrisma.session.create).toHaveBeenCalledWith({ data: {} })
  })
})
