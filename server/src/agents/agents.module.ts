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
      useFactory: (config: ConfigService) =>
        new Agent({
          id: 'action-validator',
          name: 'action-validator',
          instructions:
            'You validate whether player actions are physically and narratively possible in the game world. Return accepted, modified, or rejected with a reason.',
          model: {
            id: 'openai/gpt-4o-mini',
            url: 'https://openrouter.ai/api/v1',
            apiKey: config.getOrThrow('OPENROUTER_API_KEY'),
          },
        }),
      inject: [ConfigService],
    },
    {
      provide: 'CHOICE_GENERATOR_AGENT',
      useFactory: (config: ConfigService) =>
        new Agent({
          id: 'choice-generator',
          name: 'choice-generator',
          instructions:
            'You generate 3 narrative choices for the player given the current story beat. Return choices as structured JSON.',
          model: {
            id: 'openai/gpt-4o-mini',
            url: 'https://openrouter.ai/api/v1',
            apiKey: config.getOrThrow('OPENROUTER_API_KEY'),
          },
        }),
      inject: [ConfigService],
    },
  ],
  exports: [ActionValidatorService, ChoiceGeneratorService, 'ACTION_VALIDATOR_AGENT', 'CHOICE_GENERATOR_AGENT'],
})
export class AgentsModule {}
