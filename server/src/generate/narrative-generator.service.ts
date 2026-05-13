import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class NarrativeGeneratorService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: config.getOrThrow<string>('OPENROUTER_API_KEY'),
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }
}
