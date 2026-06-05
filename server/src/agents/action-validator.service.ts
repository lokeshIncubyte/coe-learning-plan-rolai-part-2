import { Injectable, Inject } from '@nestjs/common';
import type { Agent } from '@mastra/core/agent';
import { z } from 'zod';

const ValidationOutcomeSchema = z.object({
  result: z.enum(['accepted', 'modified', 'rejected']),
  reason: z.string(),
  modifiedAction: z.string().optional(),
});

export type ValidationOutcome = z.infer<typeof ValidationOutcomeSchema>;

@Injectable()
export class ActionValidatorService {
  constructor(@Inject('ACTION_VALIDATOR_AGENT') private readonly agent: Agent) {}

  async validate(action: string, ruleContext = ''): Promise<ValidationOutcome> {
    if (!ruleContext) return { result: 'accepted', reason: 'No world rules to validate against.' };
    const result = await this.agent.generate(`${ruleContext}\n\n${action}`, { structuredOutput: { schema: ValidationOutcomeSchema } });
    return result.object as ValidationOutcome;
  }
}
