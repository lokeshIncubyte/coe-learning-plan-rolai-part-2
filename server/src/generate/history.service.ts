import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async logEntry(
    sessionId: string,
    narrative: string,
    anchor: string,
    deltas: unknown[],
  ): Promise<void> {
    await this.prisma.generationHistory.create({
      data: { sessionId, narrative, anchor, deltas },
    })
  }
}
