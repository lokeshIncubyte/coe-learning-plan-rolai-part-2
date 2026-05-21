import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [entityCount, edgeCount, sessionCount, historyCount, latestHistory] = await Promise.all([
      this.prisma.entity.count(),
      this.prisma.edge.count(),
      this.prisma.session.count(),
      this.prisma.generationHistory.count(),
      this.prisma.generationHistory.findFirst({ orderBy: { createdAt: 'desc' } }),
    ])
    return {
      entityCount,
      edgeCount,
      sessionCount,
      historyCount,
      latestHistoryAt: latestHistory?.createdAt ?? null,
    }
  }
}
