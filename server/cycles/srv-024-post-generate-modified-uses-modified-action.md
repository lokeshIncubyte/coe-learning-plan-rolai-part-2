---
id: srv-024
slug: post-generate-modified-uses-modified-action
status: done
source: "Gap 1 — POST path `modified` outcome not handled in generate()"
covers: happy-path
---

## Behavior
When `ActionValidatorService.validate()` returns `{ result: 'modified', modifiedAction: 'safe action' }`, the POST `/generate` handler passes `'safe action'` to `NarrativeGeneratorService.generate()` instead of the original `body.prompt`.

## RED
- **Test file**: `src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  it('generates narrative with modifiedAction when validator returns modified', async () => {
    const module = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('narrative'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'modified', modifiedAction: 'safe action', reason: 'too dangerous' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { getEntitiesByType: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    const ctrl = module.get(GenerateController);
    const narrativeSvc = module.get(NarrativeGeneratorService);

    await ctrl.generate({ prompt: 'dangerous action' });

    expect(narrativeSvc.generate).toHaveBeenCalledWith('safe action');
  });
  ```
- **Why it fails**: `generate.controller.ts` line 78 passes `body.prompt` unconditionally; `'dangerous action'` is used instead of `'safe action'`.

## GREEN
- After the `rejected` guard (line 75-77), compute `effectivePrompt`:
  ```ts
  const effectivePrompt = outcome.result === 'modified' && outcome.modifiedAction
    ? outcome.modifiedAction
    : body.prompt;
  ```
  Then pass `effectivePrompt` to `narrativeService.generate(effectivePrompt)`. The `choiceGeneratorService.generateChoices()` call is unchanged — it already receives `(narrative, worldContext)` and does not need `effectivePrompt`.
- **Files touched**: `src/generate/generate.controller.ts`

## REFACTOR
none
