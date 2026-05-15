import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GenerationHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async saveGeneration(sessionId: string, narrative: string, anchor: string, deltas: object[]) {
    return this.prisma.generationHistory.create({ data: { sessionId, narrative, anchor, deltas } });
  }

  async getHistoryBySession(sessionId: string, page: number, limit: number) {
    return this.prisma.generationHistory.findMany({
      where: { sessionId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
