import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GraphService } from '../generate/graph.service';
import { EmbeddingService } from '../generate/embedding.service';

export type NewEntityDelta = { op: 'new_entity'; identity: { name: string; type: string; archetype?: string; backstory?: string; role?: string; sensoryProfile?: string }; state: Record<string, unknown>; source?: string; sourceChunk?: string };
export type IdentityShiftDelta = { op: 'identity_shift'; entityId: string; patch: Partial<{ name: string; type: string; archetype: string; backstory: string; role: string; sensoryProfile: string }> };
export type StateMutationDelta = { op: 'state_mutation'; entityId: string; patch: Record<string, unknown> };
export type NewEdgeDelta = { op: 'new_edge'; fromId: string; toId: string; type: string; weight?: number; tags?: string[] };
export type Delta = NewEntityDelta | IdentityShiftDelta | StateMutationDelta | NewEdgeDelta;

const SYSTEM_PROMPT = `Extract entities and relationships from narrative text as JSON: { "deltas": Delta[] }.

Ops:
- "new_entity": identity { name, type, archetype?, backstory?, role?, sensoryProfile? } + state { ...mutable }. Identity embeds for search; state never embeds.
- "identity_shift": entityId + identity patch.
- "state_mutation": entityId + state patch.
- "new_edge": fromId, toId, type, weight (0-1).

Rules:
- Identity (what it IS): name, type, archetype, backstory, role, sensoryProfile.
- sensoryProfile = dominant perceptual mode inferred from type (noble→visual, knight→auditory+tactile, peasant→balanced, child→visual+tactile, wildling→olfactory+auditory, scout→auditory+tactile, warg→olfactory).
- State (current condition): hp, location, mood, inventory, status.
- Never mix identity and state fields.
- Return JSON only, no markdown.`;

@Injectable()
export class ExtractorService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService, private readonly graphService: GraphService, private readonly embeddingService?: EmbeddingService) {
    const helperApisUrl = config?.get?.('HELPER_APIS_URL');
    if (helperApisUrl) {
      this.client = new OpenAI({ apiKey: 'local', baseURL: `${helperApisUrl}/v1` });
      this.model = 'anthropic/claude-sonnet-4-6';
    } else {
      this.client = new OpenAI({ apiKey: config?.get?.('OPENROUTER_API_KEY') ?? 'local', baseURL: 'https://openrouter.ai/api/v1' });
      this.model = 'openai/gpt-4o-mini';
    }
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
    const parsed = JSON.parse(raw);
    return parsed.deltas ?? [];
  }

  async applyDeltas(deltas: Delta[], anchorId?: string): Promise<{ entityCount: number; edgeCount: number }> {
    let entityCount = 0;
    let edgeCount = 0;

    for (const delta of deltas) {
      if (delta.op === 'new_entity') {
        const facts = { ...(delta.source ? { source: delta.source } : {}) };
        const entity = await this.graphService.createEntity({ ...delta.identity, state: delta.state ?? {}, facts });
        await this.embeddingService?.embedEntityIdentity(entity.id);
        if (anchorId) {
          await this.graphService.createEdge({ fromId: anchorId, toId: entity.id, type: 'contains', weight: 1.0, tags: [] });
        }
        entityCount++;
      } else if (delta.op === 'identity_shift') {
        await this.graphService.updateEntityIdentity(delta.entityId, delta.patch);
      } else if (delta.op === 'state_mutation') {
        await this.graphService.updateEntityState(delta.entityId, delta.patch);
      } else if (delta.op === 'new_edge') {
        try {
          await this.graphService.createEdge({ fromId: delta.fromId, toId: delta.toId, type: delta.type, weight: delta.weight ?? 1.0, tags: delta.tags ?? [] });
          edgeCount++;
        } catch {
          // Skip edges whose fromId/toId don't exist yet (LLM may hallucinate entity IDs)
        }
      }
    }

    return { entityCount, edgeCount };
  }
}
