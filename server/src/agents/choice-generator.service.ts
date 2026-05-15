import { Injectable, Inject } from '@nestjs/common';
import type { Agent } from '@mastra/core/agent';
import { z } from 'zod';

const ChoicesSchema = z.object({
  choices: z.array(
    z.object({
      label: z.string(),
      entities: z.array(z.string()),
      rules: z.array(z.string()),
    }),
  ),
});

export type Choice = { label: string; entities: string[]; rules: string[] };

@Injectable()
export class ChoiceGeneratorService {
  constructor(@Inject('CHOICE_GENERATOR_AGENT') private readonly agent: Agent) {}

  async generateChoices(narrative: string, worldContext = ''): Promise<Choice[]> {
    const prompt = worldContext ? `${worldContext}\n\n${narrative}` : narrative;
    const result = await this.agent.generate(prompt, { structuredOutput: { schema: ChoicesSchema } });
    return (result.object as { choices: Choice[] }).choices;
  }
}
