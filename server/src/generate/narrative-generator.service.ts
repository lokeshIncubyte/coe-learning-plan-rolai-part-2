import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { metaDirectives } from '../config/meta-directives';
import { styleGuide } from '../config/style-guide';

@Injectable()
export class NarrativeGeneratorService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: config.getOrThrow<string>('OPENROUTER_API_KEY'),
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 200,
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: prompt },
      ],
    });
    return response.choices[0].message.content ?? '';
  }

  async *stream(prompt: string, signal?: AbortSignal): AsyncGenerator<string> {
    const response = await this.client.chat.completions.create(
      {
        model: 'openai/gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 200,
        stream: true,
        messages: [
          { role: 'system', content: this.buildSystemPrompt() },
          { role: 'user', content: prompt },
        ],
      },
      { signal },
    );
    for await (const chunk of response) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) yield token;
    }
  }

  private buildSystemPrompt(): string {
    return `
You are a narrative engine for a ${metaDirectives.genre} story.

THEME: ${metaDirectives.theme}
SETTING: ${metaDirectives.setting}

CORE PRINCIPLES:
${metaDirectives.corePrinciples.map((p) => `- ${p}`).join('\n')}

WORLD RULES:
${metaDirectives.worldRules.map((r) => `- ${r}`).join('\n')}

STYLE GUIDE:
- Voice: ${styleGuide.voice}
- Tone: ${styleGuide.tone}
- POV: ${styleGuide.pointOfView}
- Sentences: ${styleGuide.sentenceStyle}

FORMAT RULES:
${styleGuide.formatRules.map((r) => `- ${r}`).join('\n')}

AVOID:
${styleGuide.avoid.map((a) => `- ${a}`).join('\n')}
    `.trim();
  }
}
