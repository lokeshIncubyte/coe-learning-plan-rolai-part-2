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

  async logUploadDeltas(chunkIndex: number, deltas: object[]): Promise<void> {
    const session = await this.prisma.session.create({ data: {} });
    await this.prisma.generationHistory.create({
      data: { sessionId: session.id, narrative: 'upload', anchor: String(chunkIndex), deltas },
    });
  }

  async getHistoryByDeltaCategory(op: string) {
    return this.prisma.$queryRaw`
      SELECT * FROM "GenerationHistory"
      WHERE deltas::jsonb @> ${JSON.stringify([{ op }])}::jsonb
      ORDER BY "createdAt" DESC
    `;
  }
}
