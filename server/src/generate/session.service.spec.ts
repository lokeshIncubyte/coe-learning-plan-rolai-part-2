import { Test } from '@nestjs/testing'
import { SessionService } from './session.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  session: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
}

describe('SessionService', () => {
  let service: SessionService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(SessionService)
    jest.clearAllMocks()
  })

  it('createSession passes userId to prisma', async () => {
    mockPrisma.session.create.mockResolvedValue({ id: 'sess-1' })
    const id = await service.createSession('user-abc')
    expect(id).toBe('sess-1')
    expect(mockPrisma.session.create).toHaveBeenCalledWith({ data: { userId: 'user-abc' } })
  })

  it('createSession works without userId', async () => {
    mockPrisma.session.create.mockResolvedValue({ id: 'sess-2' })
    await service.createSession()
    expect(mockPrisma.session.create).toHaveBeenCalledWith({ data: {} })
  })

  it('listForUser queries prisma with userId and ordering', async () => {
    mockPrisma.session.findMany.mockResolvedValue([{ id: 'a' }])
    const result = await service.listForUser('user-abc')
    expect(Array.isArray(result)).toBe(true)
    expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-abc' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { history: false },
    })
  })

  it('getHistory returns session with ordered history', async () => {
    const session = { id: 'a', history: [{ narrative: 'beat 1' }] }
    mockPrisma.session.findUniqueOrThrow.mockResolvedValue(session)
    const result = await service.getHistory('a')
    expect(result).toBe(session)
    expect(mockPrisma.session.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'a' },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    })
  })
})
