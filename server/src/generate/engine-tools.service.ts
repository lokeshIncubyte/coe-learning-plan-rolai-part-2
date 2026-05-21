import { Injectable } from '@nestjs/common';
import type { ChatCompletionFunctionTool, ChatCompletionMessageFunctionToolCall } from 'openai/resources/chat/completions';
import { EngineService } from './engine.service';
import type { UpdateSpec } from './update-spec';

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

  async dispatch(toolCall: ChatCompletionMessageFunctionToolCall, spec: UpdateSpec): Promise<unknown> {
    const args = JSON.parse(toolCall.function.arguments ?? '{}');
    switch (toolCall.function.name) {
      case 'apply_delta':
        return this.engineService.applyStateMutationDelta(args.entityId, args.patch, spec);
      case 'fire_cascade':
        return this.engineService.runCascades(args.state, spec);
      case 'resolve_rule_conflict':
        return this.engineService.resolveRuleConflict(args.candidates, args.conflictKey);
      default:
        throw new Error(`Unknown tool: ${toolCall.function.name}`);
    }
  }
}
