---
id: cycle-025
slug: sse-stream-rejected-emits-rejected-event
status: done
source: "Gap 2 — SSE path skips ActionValidator: rejected path"
covers: error-path
group: sse-validation
---

## Behavior
When `ActionValidatorService.validate()` returns `{ result: 'rejected', reason: 'impossible action' }` in the SSE stream endpoint, the observable emits exactly one event `{ type: 'rejected', reason: 'impossible action' }` and completes without emitting `start` or calling `narrativeService.stream()`.

## RED
- **Test file**: `src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  it('emits rejected event and completes without streaming when validator rejects', async () => {
    const module = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn(), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'rejected', reason: 'impossible action' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { getEntitiesByType: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    const ctrl = module.get(GenerateController);
    const narrativeSvc = module.get(NarrativeGeneratorService);

    const events: any[] = [];
    await new Promise<void>((resolve, reject) => {
      ctrl.stream({ prompt: 'impossible' }).subscribe({
        next: (e) => events.push(e.data),
        error: reject,
        complete: resolve,
      });
    });

    expect(events).toEqual([{ type: 'rejected', reason: 'impossible action' }]);
    expect(narrativeSvc.stream).not.toHaveBeenCalled();
  });
  ```
- **Why it fails**: `stream()` never calls `validatorService.validate()`; it immediately emits `{ type: 'start' }` and calls `narrativeService.stream()`.

## GREEN
- In `stream()`, before emitting `start`, add:
  1. Fetch rules: `const rules = await this.graphService.getEntitiesByType('rule');`
  2. Build `ruleContext` string (same pattern as POST handler).
  3. Fetch chars/locs/objs and build `worldContext` (scaffolded here; used by cycle-027).
  4. Call `const outcome = await this.validatorService.validate(query.prompt, ruleContext);`
  5. If `outcome.result === 'rejected'`: emit `{ type: 'rejected', reason: outcome.reason }`, call `subscriber.complete()`, return.
  6. Otherwise continue to emit `start` and stream.
- **Files touched**: `src/generate/generate.controller.ts`
- **Existing-test fix required**: After this GREEN lands, `stream()` calls `await validatorService.validate()`. The existing `describe('stream SSE endpoint')` `beforeEach` at line 46 uses `{ validate: jest.fn() }` (no return value → resolves to `undefined`) and `getEntitiesByType: jest.fn().mockReturnValue([])` (plain array, not a Promise). Update that `beforeEach` to:
  - `validate: jest.fn().mockResolvedValue({ result: 'accepted' })`
  - `getEntitiesByType: jest.fn().mockResolvedValue([])`

  These are the only changes needed to keep the three pre-existing SSE tests green.

## REFACTOR
Extract the entity-fetching + context-building logic into a private method `buildContexts()` shared by both `generate()` and `stream()` to eliminate duplication.
