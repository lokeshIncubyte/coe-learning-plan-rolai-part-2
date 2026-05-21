import { Injectable } from '@nestjs/common';
import type { ChatCompletionFunctionTool } from 'openai/resources/chat/completions';
import { EngineService } from './engine.service';

@Injectable()
export class EngineToolsService {
  constructor(private readonly engineService: EngineService) {}

  getTools(): ChatCompletionFunctionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'apply_delta',
          description: 'Apply a state mutation delta to an entity in the graph layer.',
          parameters: {
            type: 'object',
            properties: {
              entityId: { type: 'string' },
              patch: { type: 'object', additionalProperties: true },
            },
            required: ['entityId', 'patch'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'fire_cascade',
          description: 'Evaluate cascade rules against the given state and return patches to apply.',
          parameters: {
            type: 'object',
            properties: {
              state: { type: 'object', additionalProperties: true },
            },
            required: ['state'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'resolve_rule_conflict',
          description: 'Resolve a conflict between competing rule patches by priority.',
          parameters: {
            type: 'object',
            properties: {
              candidates: { type: 'array', items: { type: 'object' } },
              conflictKey: { type: 'string' },
            },
            required: ['candidates', 'conflictKey'],
          },
        },
      },
    ];
  }
}
