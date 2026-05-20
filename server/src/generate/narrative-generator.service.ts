import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { metaDirectives } from '../config/meta-directives';
import { styleGuide } from '../config/style-guide';

@Injectable()
export class NarrativeGeneratorService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const helperApisUrl = config.get<string>('HELPER_APIS_URL');
    if (helperApisUrl) {
      this.client = new OpenAI({ apiKey: 'local', baseURL: `${helperApisUrl}/v1` });
      this.model = 'anthropic/claude-sonnet-4-6';
    } else {
      this.client = new OpenAI({ apiKey: config.getOrThrow<string>('OPENROUTER_API_KEY'), baseURL: 'https://openrouter.ai/api/v1' });
      this.model = 'openai/gpt-4o-mini';
    }
  }

  async generate(prompt: string, worldContext?: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.8,
      max_tokens: 200,
      messages: [
        { role: 'system', content: this.buildSystemPrompt(worldContext) },
        { role: 'user', content: prompt },
      ],
    });
    return response.choices[0].message.content ?? '';
  }

  async *stream(prompt: string, signal?: AbortSignal, worldContext?: string): AsyncGenerator<string> {
    const response = await this.client.chat.completions.create(
      {
        model: this.model,
        temperature: 0.8,
        max_tokens: 200,
        stream: true,
        messages: [
          { role: 'system', content: this.buildSystemPrompt(worldContext) },
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

  private buildSystemPrompt(worldContext?: string): string {
    const worldBlock = worldContext?.trim()
      ? `\n\nWORLD CONTEXT — you MUST ground the narrative in the entities named below. Reuse their names verbatim; do not invent replacement characters or places when one is supplied here:\n${worldContext}`
      : '';
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
    `.trim() + worldBlock;
  }
}
