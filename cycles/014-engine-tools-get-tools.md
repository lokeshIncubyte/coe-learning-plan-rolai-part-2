---
id: cycle-014
slug: engine-tools-get-tools
status: done
source: "EngineToolsService.getTools() returns exactly 3 ChatCompletionFunctionTool definitions: apply_delta, fire_cascade, resolve_rule_conflict"
covers: happy-path
group: engine-tools
---

## Dependencies

### Package
openai@6.37.0
Resolved .d.ts (interface): node_modules/openai/resources/chat/completions/completions.d.ts
Resolved .d.ts (FunctionDefinition): node_modules/openai/resources/shared.d.ts
Runtime keys: ChatCompletionTool, ChatCompletionFunctionTool, ChatCompletionMessageToolCall, ChatCompletionMessageFunctionToolCall (re-exported from client.d.ts)
Conflict: none

```
// from completions.d.ts:
export interface ChatCompletionFunctionTool {
    function: Shared.FunctionDefinition;
    type: 'function';
}

// from shared.d.ts:
export type FunctionParameters = {
    [key: string]: unknown;
};

export interface FunctionDefinition {
    name: string;
    description?: string;
    parameters?: FunctionParameters;
    strict?: boolean | null;
}
```

## Behavior
`EngineToolsService` is a new `@Injectable()` class in `src/generate/engine-tools.service.ts`. It takes `EngineService` as a constructor dependency. Its `getTools()` method returns a static array of exactly three `ChatCompletionFunctionTool` objects — one per engine operation — each with `type: 'function'` and the correct `function.name`. This is pure static data; no EngineService call is made.

## RED

- **Test file**: `src/generate/engine-tools.service.spec.ts` (new file)
- **Assertion**:
  ```ts
  import { EngineToolsService } from './engine-tools.service';

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
  ```
- **Why it fails**: `engine-tools.service.ts` does not exist — the import fails at module resolution, causing the test suite to error before any assertion runs.

## GREEN

- **Smallest change**: Create `src/generate/engine-tools.service.ts` with `@Injectable() class EngineToolsService` that accepts `private readonly engineService: EngineService` and implements `getTools(): ChatCompletionFunctionTool[]` returning the 3 static tool definitions with appropriate `function.name`, `function.description`, and a minimal `function.parameters` JSON Schema for each.
- **Files touched**: `src/generate/engine-tools.service.ts` (new)

## REFACTOR
none
