import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GraphService } from '../generate/graph.service';
import { EmbeddingService } from '../generate/embedding.service';

export type NewEntityDelta = { op: 'new_entity'; identity: { name: string; type: string; archetype?: string; backstory?: string; role?: string; sensoryProfile?: string }; state: Record<string, unknown>; source?: string; sourceChunk?: string };
export type IdentityShiftDelta = { op: 'identity_shift'; entityId?: string; entityName?: string; patch: Partial<{ name: string; type: string; archetype: string; backstory: string; role: string; sensoryProfile: string }> };
export type StateMutationDelta = { op: 'state_mutation'; entityId?: string; entityName?: string; patch: Record<string, unknown> };
export type NewEdgeDelta = { op: 'new_edge'; fromId?: string; toId?: string; fromName?: string; toName?: string; type: string; weight?: number; tags?: string[] };
export type Delta = NewEntityDelta | IdentityShiftDelta | StateMutationDelta | NewEdgeDelta;

const SYSTEM_PROMPT = `Extract entities and relationships from narrative text.

You MUST respond with ONLY a JSON object using this exact top-level key: { "deltas": [...] }

Each item in "deltas" is one of:
- { "op": "new_entity", "identity": { "name": "...", "type": "...", "archetype": "...", "backstory": "...", "role": "...", "sensoryProfile": "..." }, "state": { "hp": ..., "location": "...", "mood": "...", "status": "..." } }
- { "op": "identity_shift", "entityName": "<exact name of existing entity>", "patch": { "archetype": "...", "backstory": "...", "role": "..." } }
- { "op": "state_mutation", "entityName": "<exact name of existing entity>", "patch": { "hp": ..., "mood": "...", "status": "..." } }
- { "op": "new_edge", "fromName": "<exact name of entity>", "toName": "<exact name of entity>", "type": "...", "weight": 0.8 }

Example output:
{
  "deltas": [
    { "op": "new_entity", "identity": { "name": "Aldric", "type": "knight", "archetype": "protector", "backstory": "rose from poverty", "role": "guardian", "sensoryProfile": "auditory+tactile" }, "state": { "hp": 100, "location": "castle gates", "mood": "vigilant", "status": "active" } },
    { "op": "new_entity", "identity": { "name": "Ironkeep", "type": "location", "archetype": "fortress" }, "state": { "status": "occupied" } },
    { "op": "new_edge", "fromName": "Aldric", "toName": "Ironkeep", "type": "guards", "weight": 1.0 },
    { "op": "state_mutation", "entityName": "Aldric", "patch": { "mood": "weary" } }
  ]
}

Rules:
- ALWAYS use the "deltas" key at the top level — never use "entities", "result", or any other key.
- Identity fields (what it IS): name, type, archetype, backstory, role, sensoryProfile. These are stable and searchable.
- State fields (current condition): hp, location, mood, inventory, status. These are mutable.
- sensoryProfile for type: noble→visual, knight→auditory+tactile, peasant→balanced, child→visual+tactile, wildling→olfactory+auditory, scout→auditory+tactile, warg→olfactory.
- Use "new_entity" for any person, place, object, faction, or rule mentioned in the text that does not already exist.
- Use "identity_shift" to update WHO or WHAT an entity is (archetype, role, backstory change). Use entityName with the entity's exact name.
- Use "state_mutation" to update CURRENT CONDITION (hp, mood, location, status change). Use entityName with the entity's exact name.
- Use "new_edge" to capture a relationship between two entities — use fromName and toName with exact entity names.
- If nothing can be extracted, return: { "deltas": [] }`;

@Injectable()
export class ExtractorService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService, private readonly graphService: GraphService, private readonly embeddingService?: EmbeddingService) {
    this.client = new OpenAI({
      apiKey: config?.getOrThrow?.('MISTRAL_API_KEY') ?? '',
      baseURL: 'https://api.mistral.ai/v1',
    });
    this.model = 'mistral-small-latest';
  }

  async extractDeltas(chunk: string): Promise<Delta[]> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: chunk },
      ],
    });
    const raw = response.choices[0].message.content ?? '{"deltas":[]}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn('[ExtractorService] LLM returned non-JSON. Raw:', raw.slice(0, 200));
      return [];
    }
    if (!Array.isArray(parsed.deltas)) {
      console.warn('[ExtractorService] LLM response missing "deltas" array. Raw:', raw.slice(0, 200));
      return [];
    }
    return parsed.deltas as Delta[];
  }

  private async resolveEntityName(name: string): Promise<string | null> {
    return this.graphService.findEntityByName(name);
  }

  async applyDeltas(deltas: Delta[], anchorId?: string): Promise<{ entityCount: number; edgeCount: number }> {
    let entityCount = 0;
    let edgeCount = 0;

    // Pass 1: create new entities first so name resolution works within the same chunk
    for (const delta of deltas) {
      if (delta.op !== 'new_entity') continue;
      const facts = { ...(delta.source ? { source: delta.source } : {}) };
      const { name, type, archetype, backstory, role, sensoryProfile } = delta.identity;
      const entity = await this.graphService.createEntity({ name, type, archetype, backstory, role, sensoryProfile, state: delta.state ?? {}, facts });
      await this.embeddingService?.embedEntityIdentity(entity.id);
      if (anchorId) {
        await this.graphService.createEdge({ fromId: anchorId, toId: entity.id, type: 'contains', weight: 1.0, tags: [] });
      }
      entityCount++;
    }

    // Pass 2: mutations and relationships — resolve names to IDs
    for (const delta of deltas) {
      if (delta.op === 'identity_shift') {
        const id = delta.entityId ?? (delta.entityName ? await this.resolveEntityName(delta.entityName) : null);
        if (!id) continue;
        await this.graphService.updateEntityIdentity(id, delta.patch);
      } else if (delta.op === 'state_mutation') {
        const id = delta.entityId ?? (delta.entityName ? await this.resolveEntityName(delta.entityName) : null);
        if (!id) continue;
        await this.graphService.updateEntityState(id, delta.patch);
      } else if (delta.op === 'new_edge') {
        try {
          const fromId = delta.fromId ?? (delta.fromName ? await this.resolveEntityName(delta.fromName) : null);
          const toId = delta.toId ?? (delta.toName ? await this.resolveEntityName(delta.toName) : null);
          if (!fromId || !toId) continue;
          await this.graphService.createEdge({ fromId, toId, type: delta.type, weight: delta.weight ?? 1.0, tags: delta.tags ?? [] });
          edgeCount++;
        } catch {
          // skip edges whose IDs don't exist
        }
      }
    }

    return { entityCount, edgeCount };
  }
}
