import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EnrichedEntity = {
  id: string;
  type: string;
  name: string;
  tags: string[];
  facts: unknown;
  archetype?: string | null;
  backstory?: string | null;
  role?: string | null;
  identity_version: number;
  state: unknown;
  last_beat?: string | null;
  createdAt: Date;
  updatedAt: Date;
  fromEdges: unknown[];
  toEdges: unknown[];
};

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllEntitiesWithEdges(): Promise<EnrichedEntity[]> {
    return this.prisma.entity.findMany({
      where: { type: { notIn: ['rule'] } },
      include: { fromEdges: true, toEdges: true },
    }) as unknown as EnrichedEntity[];
  }

  async enrichWithState(ids: string[]): Promise<EnrichedEntity[]> {
    const entities = await this.prisma.entity.findMany({
      where: { id: { in: ids } },
      include: { fromEdges: true, toEdges: true },
    });
    const byId = new Map(entities.map((e) => [e.id, e]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as EnrichedEntity[];
  }

  async findSimilarEntityIds(
    queryEmbedding: number[],
    limit: number,
    threshold = 0.7,
  ): Promise<Array<{ id: string; similarity: number }>> {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    return this.prisma.$queryRawUnsafe<Array<{ id: string; similarity: number }>>(
      `SELECT id, 1 - (embedding <=> '${embeddingStr}'::vector) AS similarity
       FROM "Entity"
       WHERE embedding IS NOT NULL
         AND 1 - (embedding <=> '${embeddingStr}'::vector) >= $1
       ORDER BY embedding <=> '${embeddingStr}'::vector
       LIMIT $2`,
      threshold,
      limit,
    );
  }

  async createEntity(data: any) {
    return this.prisma.entity.create({ data });
  }

  async getEntityById(id: string) {
    const entity = await this.prisma.entity.findUnique({ where: { id } });
    if (!entity) throw new NotFoundException(`Entity ${id} not found`);
    return entity;
  }

  async getEntitiesByType(type: string) {
    return this.prisma.entity.findMany({ where: { type } });
  }

  async getEntitiesByTag(tag: string) {
    return this.prisma.entity.findMany({ where: { tags: { has: tag } } });
  }

  async createEdge(data: any) {
    return this.prisma.edge.create({ data });
  }

  async updateEntityState(id: string, patch: Record<string, unknown>) {
    return this.prisma.$transaction(async (tx: any) => {
      const entity = await tx.entity.findUnique({ where: { id } });
      const merged = { ...(entity?.state as object ?? {}), ...patch };
      return tx.entity.update({ where: { id }, data: { state: merged } });
    });
  }

  async updateEdgeWeight(id: string, weight: number) {
    return this.prisma.edge.update({ where: { id }, data: { weight } });
  }
}
