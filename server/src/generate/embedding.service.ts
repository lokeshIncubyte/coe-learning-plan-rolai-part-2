import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmbeddingService {
  private readonly openai: OpenAI;

  static readonly EMBEDDING_DIM = 384;
  private readonly model = 'Xenova/all-MiniLM-L6-v2';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const helperApisUrl = config.get<string>('HELPER_APIS_URL') ?? 'http://localhost:4000';
    this.openai = new OpenAI({ apiKey: 'local', baseURL: `${helperApisUrl}/v1` });
  }

  async embedEntityIdentity(entityId: string): Promise<void> {
    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) return;
    const text = this.buildIdentityText(entity);
    const embedding = await this.generateEmbedding(text);
    const embeddingStr = `[${embedding.join(',')}]`;
    await this.prisma.$executeRawUnsafe(
      `UPDATE "Entity" SET embedding = '${embeddingStr}'::vector WHERE id = $1`,
      entityId,
    );
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({ model: this.model, input: text });
    return response.data[0].embedding;
  }

  shouldReembed(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): boolean {
    const identityFields = ['name', 'type', 'archetype', 'backstory', 'role'] as const;
    return identityFields.some((f) => before[f] !== after[f]);
  }

  buildIdentityText(entity: {
    name: string;
    type: string;
    archetype?: string | null;
    backstory?: string | null;
    role?: string | null;
  }): string {
    return [entity.name, entity.type, entity.archetype, entity.backstory, entity.role]
      .filter(Boolean)
      .join(' | ');
  }
}
