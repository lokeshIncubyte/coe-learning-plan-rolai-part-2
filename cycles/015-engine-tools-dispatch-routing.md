---
id: cycle-015
slug: engine-tools-dispatch-routing
status: done
source: "EngineToolsService.dispatch() parses tool call arguments and routes apply_delta → applyStateMutationDelta, fire_cascade → runCascades, resolve_rule_conflict → resolveRuleConflict"
covers: happy-path
group: engine-tools
---

## Dependencies

### Package
openai@6.37.0
Resolved .d.ts: node_modules/openai/resources/chat/completions/completions.d.ts
Conflict: none

```
export interface ChatCompletionMessageFunctionToolCall {
    id: string;
    function: ChatCompletionMessageFunctionToolCall.Function;
    type: 'function';
}
declare namespace ChatCompletionMessageFunctionToolCall {
    interface Function {
        arguments: string;   // JSON-encoded string; always present (validate before parsing)
        name: string;
    }
}
```

## Behavior
`EngineToolsService.dispatch(toolCall, spec)` parses `toolCall.function.arguments` with `JSON.parse` and switches on `toolCall.function.name`:
- `'apply_delta'` → `await engineService.applyStateMutationDelta(args.entityId, args.patch, spec)` and returns the result.
- `'fire_cascade'` → `engineService.runCascades(args.state, spec)` and returns the result.
- `'resolve_rule_conflict'` → `engineService.resolveRuleConflict(args.candidates, args.conflictKey)` and returns the result.

(Integration smoke lives in cycle-016, the last cycle in the engine-tools group.)

## RED

- **Test file**: `src/generate/engine-tools.service.spec.ts`
- **Assertion**:
  ```ts
  import { EngineToolsService } from './engine-tools.service';
  import type { ChatCompletionMessageFunctionToolCall } from 'openai/resources/chat/completions';

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
  });
  ```
- **Why it fails**: `EngineToolsService` has no `dispatch` method — calling it throws `TypeError: svc.dispatch is not a function`.

## GREEN

- **Smallest change**: Add `async dispatch(toolCall: ChatCompletionMessageFunctionToolCall, spec: UpdateSpec): Promise<unknown>` to `EngineToolsService`. Parse `toolCall.function.arguments ?? '{}'` with `JSON.parse`, then switch on `toolCall.function.name` to delegate to the appropriate `this.engineService` method.
- **Files touched**: `src/generate/engine-tools.service.ts`

## REFACTOR
Extract argument parsing into a private `parseArgs` helper if the switch grows beyond 3 cases.
