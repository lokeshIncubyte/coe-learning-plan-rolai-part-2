---
id: cycle-016
slug: engine-tools-dispatch-unknown-name
status: skip
source: "EngineToolsService.dispatch() with an unrecognised function name throws an Error containing the unknown name"
covers: error-path
group: engine-tools
---

## Dependencies

**(none — pure logic cycle)**

## Behavior
When `dispatch` receives a tool call whose `function.name` does not match any of the three registered names, it throws `new Error(`Unknown tool: ${name}`)`. This prevents silent `undefined` returns from leaking into callers when the model hallucinates a function name.

Integration smoke (last cycle in engine-tools group): instantiate `EngineToolsService` with a real `EngineService` instance (using `jest.spyOn` rather than a full mock) and call `dispatch` for each of the three valid tool names (`apply_delta`, `fire_cascade`, `resolve_rule_conflict`) — assert the engine methods are called with the correct arguments and return values propagate correctly. Then call `dispatch` with an unrecognised name and assert it rejects with a message containing the unknown name.

## RED

- **Test file**: `src/generate/engine-tools.service.spec.ts`
- **Assertion**:
  ```ts
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
  ```
- **Why it fails**: After cycle-015 is implemented, the switch falls through without throwing — `dispatch` returns `undefined` rather than rejecting.

## GREEN

- **Smallest change**: Add a `default` branch to the switch in `dispatch` that throws `new Error(`Unknown tool: ${toolCall.function.name}`)`.
- **Files touched**: `src/generate/engine-tools.service.ts`

## REFACTOR
none
