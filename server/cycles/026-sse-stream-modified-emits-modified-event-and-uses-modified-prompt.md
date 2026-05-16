---
id: cycle-026
slug: sse-stream-modified-emits-modified-event-and-uses-modified-prompt
status: done
source: "Gap 2 — SSE path skips ActionValidator: modified path"
covers: happy-path
group: sse-validation
---

## Behavior
When `ActionValidatorService.validate()` returns `{ result: 'modified', modifiedAction: 'adjusted action' }` in the SSE stream endpoint, the observable emits `{ type: 'modified', modifiedAction: 'adjusted action' }` before `{ type: 'start' }`, and `narrativeService.stream()` is called with `'adjusted action'` instead of the original prompt.

## RED
- **Test file**: `src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  it('emits modified event then streams using modifiedAction when validator returns modified', async () => {
    async function* tokens() { yield 'story'; }
    const module = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn(), stream: jest.fn().mockImplementation(() => tokens()) } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'modified', modifiedAction: 'adjusted action', reason: 'adjusted' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { getEntitiesByType: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    const ctrl = module.get(GenerateController);
    const narrativeSvc = module.get(NarrativeGeneratorService);

    const events: any[] = [];
    await new Promise<void>((resolve, reject) => {
      ctrl.stream({ prompt: 'original prompt' }).subscribe({
        next: (e) => events.push(e.data),
        error: reject,
        complete: resolve,
      });
    });

    expect(events[0]).toEqual({ type: 'modified', modifiedAction: 'adjusted action' });
    expect(narrativeSvc.stream).toHaveBeenCalledWith('adjusted action', expect.any(Object));
  });
  ```
- **Why it fails**: `stream()` does not call `validate()`, never emits `{ type: 'modified' }`, and always calls `narrativeService.stream(query.prompt, ...)`.

## GREEN
- After the rejected guard added in cycle-025, add:
  ```ts
  const effectivePrompt = outcome.result === 'modified' && outcome.modifiedAction
    ? outcome.modifiedAction
    : query.prompt;
  if (outcome.result === 'modified' && outcome.modifiedAction) {
    subscriber.next({ data: { type: 'modified', modifiedAction: outcome.modifiedAction } });
  }
  ```
  Then replace `this.narrativeService.stream(query.prompt, abort.signal)` with `this.narrativeService.stream(effectivePrompt, abort.signal)`.
- **Files touched**: `src/generate/generate.controller.ts`
- **Pre-condition**: The existing `describe('stream SSE endpoint')` `beforeEach` must have been updated per cycle-025's existing-test fix (validate mocked to `mockResolvedValue({ result: 'accepted' })`) before this cycle's GREEN is applied.

## REFACTOR
none
