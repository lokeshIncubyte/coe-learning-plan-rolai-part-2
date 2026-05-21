import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
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

describe('SessionService — exportSession', () => {
  it('returns session with nested history', async () => {
    const mockSession = {
      id: 'sess-export',
      createdAt: new Date(),
      history: [{ id: 'h1', sessionId: 'sess-export', narrative: 'Beat 1', anchor: 'e1', deltas: [], createdAt: new Date() }],
    }
    const mockPrisma = {
      session: {
        create: jest.fn().mockResolvedValue({ id: 'sess-abc', createdAt: new Date() }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(mockSession),
      },
    }
    const service = new SessionService(mockPrisma as any)
    const result = await service.exportSession('sess-export')
    expect(result).toEqual(mockSession)
    expect(mockPrisma.session.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'sess-export' },
      include: { history: true },
    })
  })
})

describe('SessionService — error path', () => {
  it('propagates PrismaClientKnownRequestError from session.create', async () => {
    const dbErr = new PrismaClientKnownRequestError('Connection failed', { code: 'P1001', clientVersion: '5.0.0' })
    const mockPrisma = {
      session: { create: jest.fn().mockRejectedValue(dbErr) },
    }
    const service = new SessionService(mockPrisma as any)
    await expect(service.createSession()).rejects.toThrow(PrismaClientKnownRequestError)
  })
})
