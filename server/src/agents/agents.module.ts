import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Agent } from '@mastra/core/agent';
import { ActionValidatorService } from './action-validator.service';
import { ChoiceGeneratorService } from './choice-generator.service';

@Module({
  imports: [ConfigModule],
  providers: [
    ActionValidatorService,
    ChoiceGeneratorService,
    {
      provide: 'ACTION_VALIDATOR_AGENT',
      useFactory: (config: ConfigService) => {
        const helperApisUrl = config.get<string>('HELPER_APIS_URL');
        return new Agent({
          id: 'action-validator',
          name: 'action-validator',
          instructions:
            "Validate player actions against world physics and narrative. Accepted/modified actions must remain grounded in the POV character's sensory reality. Return accepted, modified, or rejected with a one-line reason.",
          model: {
            id: helperApisUrl ? 'anthropic/claude-sonnet-4-6' : 'openai/gpt-4o-mini',
            url: helperApisUrl ? `${helperApisUrl}/v1` : 'https://openrouter.ai/api/v1',
            apiKey: helperApisUrl ? 'local' : config.getOrThrow('OPENROUTER_API_KEY'),
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'CHOICE_GENERATOR_AGENT',
      useFactory: (config: ConfigService) => {
        const helperApisUrl = config.get<string>('HELPER_APIS_URL');
        return new Agent({
          id: 'choice-generator',
          name: 'choice-generator',
          instructions:
            "Generate 3 narrative choices for the current beat. Each label evokes the POV character's dominant sense or emotion (noble→sight, knight→sound/touch, child→wonder, wildling→scent). Return structured JSON.",
          model: {
            id: helperApisUrl ? 'anthropic/claude-sonnet-4-6' : 'openai/gpt-4o-mini',
            url: helperApisUrl ? `${helperApisUrl}/v1` : 'https://openrouter.ai/api/v1',
            apiKey: helperApisUrl ? 'local' : config.getOrThrow('OPENROUTER_API_KEY'),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [ActionValidatorService, ChoiceGeneratorService, 'ACTION_VALIDATOR_AGENT', 'CHOICE_GENERATOR_AGENT'],
})
export class AgentsModule {}
