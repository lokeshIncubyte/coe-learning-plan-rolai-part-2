import { Injectable } from '@nestjs/common';

@Injectable()
export class GraphService {
  // Stub — replaced with real Prisma-backed entity graph on Day 5
  getEntities(): { id: string; type: string; name: string }[] {
    return [];
  }

  getEntitiesByType(_type: string): { id: string; type: string; name: string; facts?: Record<string, unknown> }[] {
    return [];
  }
}
