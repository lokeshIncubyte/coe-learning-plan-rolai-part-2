import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId?: string): Promise<string> {
    const session = await this.prisma.session.create({
      data: userId ? { userId } : {},
    })
    return session.id
  }

  async listForUser(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { history: false },
    })
  }

  async getHistory(sessionId: string) {
    return this.prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    })
  }

  async exportSession(id: string) {
    return this.prisma.session.findUniqueOrThrow({ where: { id }, include: { history: true } })
  }
}
