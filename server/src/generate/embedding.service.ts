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
