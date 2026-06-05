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
        return new Agent({
          id: 'action-validator',
          name: 'action-validator',
          instructions:
            "Validate player actions against world physics and narrative. Accepted/modified actions must remain grounded in the POV character's sensory reality. Return accepted, modified, or rejected with a one-line reason.",
          model: {
            id: 'mistral/mistral-small-latest',
            url: 'https://api.mistral.ai/v1',
            apiKey: config.getOrThrow('MISTRAL_API_KEY'),
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'CHOICE_GENERATOR_AGENT',
      useFactory: (config: ConfigService) => {
        return new Agent({
          id: 'choice-generator',
          name: 'choice-generator',
          instructions:
            "Generate 3 narrative choices for the current beat. Each label must be a short, concrete first-person or imperative action the POV character can take next (a verb phrase, e.g. 'Press a palm to the cold stone' or 'Follow the warm passage deeper'). It must be immediately usable as a player action prompt — not a poetic title or noun phrase. The action should foreground the POV character's dominant sense or emotion (noble→sight, knight→sound/touch, child→wonder/scale, wildling→scent). Return structured JSON.",
          model: {
            id: 'mistral/mistral-small-latest',
            url: 'https://api.mistral.ai/v1',
            apiKey: config.getOrThrow('MISTRAL_API_KEY'),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [ActionValidatorService, ChoiceGeneratorService, 'ACTION_VALIDATOR_AGENT', 'CHOICE_GENERATOR_AGENT'],
})
export class AgentsModule {}
