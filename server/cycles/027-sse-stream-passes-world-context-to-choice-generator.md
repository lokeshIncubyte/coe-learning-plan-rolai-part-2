---
id: cycle-027
slug: sse-stream-passes-world-context-to-choice-generator
status: done
source: "Gap 2 — SSE path passes empty string to choiceGenerator instead of worldContext"
covers: atomic
group: sse-validation
---

## Behavior
After streaming completes, the SSE endpoint passes the populated `worldContext` string (built from character, location, and object entities) to `choiceGeneratorService.generateChoices()` instead of an empty string `''`.

## RED
- **Test file**: `src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  it('passes worldContext to choiceGenerator in SSE path', async () => {
    async function* tokens() { yield 'story'; }
    const module = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn(), stream: jest.fn().mockImplementation(() => tokens()) } },
        {
          provide: ActionValidatorService,
          useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted', reason: '' }) },
        },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        {
          provide: GraphService,
          useValue: {
            getEntitiesByType: jest.fn().mockImplementation((type: string) => {
              if (type === 'character') return Promise.resolve([{ name: 'Hero', type: 'character' }]);
              return Promise.resolve([]);
            }),
          },
        },
      ],
    }).compile();
    const ctrl = module.get(GenerateController);
    const choiceSvc = module.get(ChoiceGeneratorService);

    await new Promise<void>((resolve, reject) => {
      ctrl.stream({ prompt: 'test' }).subscribe({ next: () => {}, error: reject, complete: resolve });
    });

    expect(choiceSvc.generateChoices).toHaveBeenCalledWith('story', expect.stringContaining('Hero'));
  });
  ```
- **Why it fails**: `stream()` currently calls `this.choiceGeneratorService.generateChoices(fullNarrative, '')` with a hardcoded empty string; `worldContext` is never built in the SSE path.

## GREEN
- The `worldContext` variable is already built as part of the validation scaffold added in cycle-025. Replace `generateChoices(fullNarrative, '')` with `generateChoices(fullNarrative, worldContext)`.
- **Files touched**: `src/generate/generate.controller.ts`

## REFACTOR
none
