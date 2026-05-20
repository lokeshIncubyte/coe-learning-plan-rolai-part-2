import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type NewEntityDelta = { op: 'new_entity'; identity: { name: string; type: string; archetype?: string; backstory?: string; role?: string }; state: Record<string, unknown>; sourceChunk?: string };
export type IdentityShiftDelta = { op: 'identity_shift'; entityId: string; patch: Partial<{ name: string; type: string; archetype: string; backstory: string; role: string }> };
export type StateMutationDelta = { op: 'state_mutation'; entityId: string; state: Record<string, unknown> };
export type NewEdgeDelta = { op: 'new_edge'; fromId: string; toId: string; type: string; weight?: number };
export type Delta = NewEntityDelta | IdentityShiftDelta | StateMutationDelta | NewEdgeDelta;

const SYSTEM_PROMPT = `You are an entity extractor for a narrative world engine.

Given a narrative text chunk, extract entities and relationships as a JSON object: { "deltas": Delta[] }

Each delta has an "op" field:
- "new_entity": a new entity appears. Use two separate sections:
  - "identity": { name, type, archetype?, backstory?, role? } — WHO/WHAT this entity is (will be embedded for semantic search)
  - "state": { ...mutableFields } — current condition (hp, location, mood, etc.) — NEVER embedded
- "identity_shift": an entity's core identity changes (name, type, archetype, backstory, role). Provide entityId + identity patch.
- "state_mutation": an entity's mutable state changes. Provide entityId + state patch.
- "new_edge": a directed relationship between two entities. Provide fromId, toId, type, weight (0-1).

RULES:
- Identity fields: name, type, archetype, backstory, role — these define what the entity IS
- State fields: hp, location, mood, inventory, status — these describe current condition
- Never put state fields inside identity block; never put identity fields inside state block
- Return valid JSON only, no markdown.`;

@Injectable()
export class ExtractorService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService, private readonly graphService: any, private readonly embeddingService?: any) {
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
        const entity = await this.graphService.createEntity({ ...delta.identity, state: delta.state ?? {} });
        await this.embeddingService?.embedEntityIdentity(entity.id);
        entityCount++;
      } else if (delta.op === 'identity_shift') {
        await this.graphService.updateEntityIdentity(delta.entityId, delta.patch);
      } else if (delta.op === 'state_mutation') {
        await this.graphService.updateEntityState(delta.entityId, delta.state);
      } else if (delta.op === 'new_edge') {
        await this.graphService.createEdge({ fromId: delta.fromId, toId: delta.toId, type: delta.type, weight: delta.weight ?? 1 });
        edgeCount++;
      }
    }

    return { entityCount, edgeCount };
  }
}
