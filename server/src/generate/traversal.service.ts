import { Injectable } from '@nestjs/common';
import type { EnrichedEntity } from './graph.service';

export type TraversedEntity = EnrichedEntity & {
  proximityScore: number;
  combinedScore: number;
};

type EdgeLike = {
  id?: string;
  fromId: string;
  toId: string;
  type?: string;
  weight?: number;
  tags?: string[];
};

type AdjEntry = { neighborId: string; weight: number; edgeTags: string[] };

@Injectable()
export class TraversalService {
  private buildAdjacency(entities: EnrichedEntity[]): Map<string, AdjEntry[]> {
    const adj = new Map<string, AdjEntry[]>();
    for (const entity of entities) {
      if (!adj.has(entity.id)) adj.set(entity.id, []);
      for (const edge of (entity.fromEdges ?? []) as EdgeLike[]) {
        adj.get(entity.id)!.push({
          neighborId: edge.toId,
          weight: edge.weight ?? 1.0,
          edgeTags: edge.tags ?? [],
        });
      }
      for (const edge of (entity.toEdges ?? []) as EdgeLike[]) {
        adj.get(entity.id)!.push({
          neighborId: edge.fromId,
          weight: edge.weight ?? 1.0,
          edgeTags: edge.tags ?? [],
        });
      }
    }
    return adj;
  }

  traverse(
    anchorId: string,
    entities: EnrichedEntity[],
    maxDepth = 2,
    tags?: string[],
  ): TraversedEntity[] {
    const entityMap = new Map<string, EnrichedEntity>(entities.map((e) => [e.id, e]));
    const adj = this.buildAdjacency(entities);
    const visited = new Map<string, { hopCount: number; weight: number }>();
    const queue: Array<{ id: string; hopCount: number; weight: number }> = [];

    if (anchorId && entityMap.has(anchorId)) {
      visited.set(anchorId, { hopCount: 0, weight: 1.0 });
      queue.push({ id: anchorId, hopCount: 0, weight: 1.0 });
    } else {
      for (const entity of entities) {
        visited.set(entity.id, { hopCount: 0, weight: 1.0 });
        queue.push({ id: entity.id, hopCount: 0, weight: 1.0 });
      }
    }

    let qi = 0;
    while (qi < queue.length) {
      const current = queue[qi++];
      if (current.hopCount >= maxDepth) continue;
      for (const neighbor of adj.get(current.id) ?? []) {
        if (tags && tags.length > 0 && !neighbor.edgeTags.some((t) => tags.includes(t))) continue;
        if (!visited.has(neighbor.neighborId) && entityMap.has(neighbor.neighborId)) {
          const nextHop = current.hopCount + 1;
          visited.set(neighbor.neighborId, { hopCount: nextHop, weight: neighbor.weight });
          queue.push({ id: neighbor.neighborId, hopCount: nextHop, weight: neighbor.weight });
        }
      }
    }

    const result: TraversedEntity[] = [];
    for (const [id, { hopCount, weight }] of visited) {
      const entity = entityMap.get(id);
      if (!entity) continue;
      const proximityScore = hopCount === 0 ? 1.0 : 1.0 / (1 + hopCount * weight);
      result.push({ ...entity, proximityScore, combinedScore: proximityScore });
    }
    return result.sort((a, b) => b.proximityScore - a.proximityScore);
  }

  scoreWithSemantics(
    traversed: TraversedEntity[],
    phase1Scores: Map<string, number>,
  ): TraversedEntity[] {
    return traversed
      .map((e) => ({
        ...e,
        combinedScore: 0.5 * e.proximityScore + 0.5 * (phase1Scores.get(e.id) ?? 0),
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore);
  }
}
