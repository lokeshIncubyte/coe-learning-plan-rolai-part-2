import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

export type SemanticRecallResult = {
  entities: EnrichedEntity[];
  scores: Map<string, number>;
};

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService?: EmbeddingService,
  ) {}

  async updateEntityIdentity(id: string, patch: Record<string, unknown>) {
    const before = await this.prisma.entity.findUnique({ where: { id } });
    if (!before) throw new NotFoundException(`Entity ${id} not found`);
    const after = await this.prisma.entity.update({ where: { id }, data: patch });
    await this.embeddingService!.onEntityWrite(
      before as unknown as Record<string, unknown>,
      after as unknown as Record<string, unknown>,
    );
    return after;
  }

  async semanticRecall(queryText: string, limit = 5): Promise<SemanticRecallResult> {
    const queryEmbedding = await this.embeddingService!.generateEmbedding(queryText);
    const candidates = await this.findSimilarEntityIds(queryEmbedding, limit);
    const scores = new Map(candidates.map((c) => [c.id, c.similarity]));
    const entities = await this.enrichWithState(candidates.map((c) => c.id));
    return { entities, scores };
  }

  async getAllEntitiesWithEdges(): Promise<EnrichedEntity[]> {
    return this.prisma.entity.findMany({
      where: { type: { notIn: ['rule'] } },
      include: { fromEdges: true, toEdges: true },
    }) as unknown as EnrichedEntity[];
  }

  async enrichWithState(ids: string[]): Promise<EnrichedEntity[]> {
    if (ids.length === 0) return [];
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
    threshold = 0.35,
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
      const before = await tx.entity.findUnique({ where: { id } });
      const merged = { ...(before?.state as object ?? {}), ...patch };
      const after = await tx.entity.update({ where: { id }, data: { state: merged } });
      await this.embeddingService?.onEntityWrite(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
      return after;
    });
  }

  async updateEdgeWeight(id: string, weight: number) {
    return this.prisma.edge.update({ where: { id }, data: { weight } });
  }

  async findEntityByName(name: string): Promise<string | null> {
    const entity = await this.prisma.entity.findFirst({
      where: { name },
      select: { id: true },
    });
    return entity?.id ?? null;
  }

  async getNeighborhood(entityIds: string[]): Promise<EnrichedEntity[]> {
    if (entityIds.length === 0) return [];
    const seeds = await this.prisma.entity.findMany({
      where: { id: { in: entityIds }, type: { not: 'rule' } },
      include: { fromEdges: true, toEdges: true },
    }) as unknown as EnrichedEntity[];

    const neighborIds = new Set<string>();
    for (const e of seeds) {
      for (const edge of e.fromEdges as any[]) neighborIds.add(edge.toId);
      for (const edge of e.toEdges as any[]) neighborIds.add(edge.fromId);
    }
    for (const id of entityIds) neighborIds.delete(id);

    if (neighborIds.size === 0) return seeds;

    const neighbors = await this.prisma.entity.findMany({
      where: { id: { in: Array.from(neighborIds) }, type: { not: 'rule' } },
      include: { fromEdges: true, toEdges: true },
    }) as unknown as EnrichedEntity[];

    return [...seeds, ...neighbors];
  }
}
