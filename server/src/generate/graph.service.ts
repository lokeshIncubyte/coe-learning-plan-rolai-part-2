import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

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
