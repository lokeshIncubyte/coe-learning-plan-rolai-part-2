import { EngineToolsService } from './engine-tools.service';
import type { ChatCompletionMessageFunctionToolCall } from 'openai/resources/chat/completions';

describe('EngineToolsService', () => {
  let service: EngineToolsService;

  beforeEach(() => {
    service = new EngineToolsService({} as any);
  });

  it('getTools() returns exactly 3 function tools', () => {
    const tools = service.getTools();
    expect(tools).toHaveLength(3);
    expect(tools.every(t => t.type === 'function')).toBe(true);
  });

  it('tool names are apply_delta, fire_cascade, resolve_rule_conflict', () => {
    const names = service.getTools().map(t => t.function.name);
    expect(names).toContain('apply_delta');
    expect(names).toContain('fire_cascade');
    expect(names).toContain('resolve_rule_conflict');
  });
});

// cycle-015
describe('EngineToolsService.dispatch', () => {
  const baseSpec = { variables: { hp: { min: 0, max: 100 } }, cascades: [] };

  it('apply_delta routes to engineService.applyStateMutationDelta', async () => {
    const applyStateMutationDelta = jest.fn().mockResolvedValue({ resolved: { hp: 80 } });
    const svc = new EngineToolsService({ applyStateMutationDelta, runCascades: jest.fn(), resolveRuleConflict: jest.fn() } as any);

    const toolCall: ChatCompletionMessageFunctionToolCall = {
      id: 'c1',
      type: 'function',
      function: { name: 'apply_delta', arguments: JSON.stringify({ entityId: 'e1', patch: { hp: 80 } }) },
    };
    const result = await svc.dispatch(toolCall, baseSpec);

    expect(applyStateMutationDelta).toHaveBeenCalledWith('e1', { hp: 80 }, baseSpec);
    expect(result).toEqual({ resolved: { hp: 80 } });
  });

  it('fire_cascade routes to engineService.runCascades', async () => {
    const runCascades = jest.fn().mockReturnValue([{ stamina: 50 }]);
    const svc = new EngineToolsService({ runCascades, applyStateMutationDelta: jest.fn(), resolveRuleConflict: jest.fn() } as any);

    const toolCall: ChatCompletionMessageFunctionToolCall = {
      id: 'c2',
      type: 'function',
      function: { name: 'fire_cascade', arguments: JSON.stringify({ state: { hp: 10 } }) },
    };
    const result = await svc.dispatch(toolCall, baseSpec);

    expect(runCascades).toHaveBeenCalledWith({ hp: 10 }, baseSpec);
    expect(result).toEqual([{ stamina: 50 }]);
  });

  it('resolve_rule_conflict routes to engineService.resolveRuleConflict', async () => {
    const winner = { ruleName: 'rule-a', patch: { hp: -5 }, priority: 10 };
    const resolveRuleConflict = jest.fn().mockReturnValue(winner);
    const svc = new EngineToolsService({ resolveRuleConflict, applyStateMutationDelta: jest.fn(), runCascades: jest.fn() } as any);
    const candidates = [winner, { ruleName: 'rule-b', patch: { hp: -1 }, priority: 5 }];

    const toolCall: ChatCompletionMessageFunctionToolCall = {
      id: 'c3',
      type: 'function',
      function: { name: 'resolve_rule_conflict', arguments: JSON.stringify({ candidates, conflictKey: 'hp' }) },
    };
    const result = await svc.dispatch(toolCall, baseSpec);

    expect(resolveRuleConflict).toHaveBeenCalledWith(candidates, 'hp');
    expect(result).toEqual(winner);
  });

  // cycle-016
  it('dispatch throws for unknown function name', async () => {
    const svc = new EngineToolsService({
      applyStateMutationDelta: jest.fn(),
      runCascades: jest.fn(),
      resolveRuleConflict: jest.fn(),
    } as any);
    const spec = { variables: {}, cascades: [] };

    await expect(
      svc.dispatch(
        { id: 'c4', type: 'function', function: { name: 'nonexistent_tool', arguments: '{}' } },
        spec,
      ),
    ).rejects.toThrow('nonexistent_tool');
  });
});
