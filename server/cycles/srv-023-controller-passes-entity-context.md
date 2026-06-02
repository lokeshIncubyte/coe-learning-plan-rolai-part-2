---
id: srv-023
slug: controller-passes-entity-context
status: skip
source: "GenerateController.generate() — injects GraphService, fetches rule entities via getEntitiesByType('rule'), formats them as a RULES: block, passes to validatorService.validate; fetches entities by type, formats as WORLD: block, passes to choiceGeneratorService.generateChoices"
covers: happy-path
---

## Behavior
`GenerateController.generate()` injects `GraphService` and, on each request, fetches rule entities via `getEntitiesByType('rule')` and character/location/object entities via `getEntitiesByType` for each type. It formats them as `RULES:\n- name: description` and `WORLD:\n- name (type)` strings respectively, then passes them as the second argument to `validatorService.validate` and `choiceGeneratorService.generateChoices`.

## RED
- **Test file**: `src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  // 1. Add this import at the TOP of the spec file, with the other imports:
  //    import { GraphService } from './graph.service';

  // 2. Add GraphService to the providers array in EVERY existing beforeEach
  //    (both the top-level one and the one inside 'stream SSE endpoint'):
  //      { provide: GraphService, useValue: { getEntitiesByType: jest.fn() } }
  //    Without this, NestJS will throw "GraphService is not a provider" when
  //    the module tries to construct GenerateController.

  // 3. The existing top-level assertion:
  //      expect(choiceGeneratorService.generateChoices).toHaveBeenCalledWith('Once upon a time...')
  //    will break once generateChoices accepts a second argument.
  //    Update it to:
  //      expect(choiceGeneratorService.generateChoices).toHaveBeenCalledWith(
  //        'Once upon a time...',
  //        expect.any(String),
  //      );

  // 4. Add as a new describe block at the bottom of describe('GenerateController'):

  describe('passes entity context to agent services', () => {
    let controller: GenerateController;
    let narrativeService: { generate: jest.Mock };
    let validatorService: { validate: jest.Mock };
    let choiceGeneratorService: { generateChoices: jest.Mock };
    let graphService: { getEntitiesByType: jest.Mock };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn() } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn() } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn() } },
          { provide: GraphService, useValue: { getEntitiesByType: jest.fn() } },
        ],
      }).compile();

      controller = module.get(GenerateController);
      narrativeService = module.get(NarrativeGeneratorService) as any;
      validatorService = module.get(ActionValidatorService) as any;
      choiceGeneratorService = module.get(ChoiceGeneratorService) as any;
      graphService = module.get(GraphService) as any;
    });

    it('fetches rule entities and passes formatted RULES block as second arg to validate', async () => {
      graphService.getEntitiesByType
        .mockResolvedValueOnce([{ name: 'No-Resurrection', facts: { description: 'Dead cannot be resurrected' } }]) // rules
        .mockResolvedValueOnce([]) // characters
        .mockResolvedValueOnce([]) // locations
        .mockResolvedValueOnce([]); // objects
      validatorService.validate.mockResolvedValueOnce({ result: 'accepted', reason: 'OK' });
      narrativeService.generate.mockResolvedValueOnce('story');
      choiceGeneratorService.generateChoices.mockResolvedValueOnce([]);

      await controller.generate({ prompt: 'test action' });

      expect(validatorService.validate).toHaveBeenCalledWith(
        'test action',
        expect.stringContaining('No-Resurrection'),
      );
    });
  });
  ```
- **Why it fails**: `GenerateController` does not inject `GraphService`; `validate` is called with `body.prompt` as the only argument.

## GREEN
- **Smallest change**:
  1. Add `GraphService` import and inject it into the constructor of `GenerateController`.
  2. In `generate()`, before calling `validate`, call `this.graphService.getEntitiesByType('rule')` and format the result as `` `RULES:\n${rules.map(r => `- ${r.name}: ${(r.facts as any)?.description ?? ''}`).join('\n')}` ``.
  3. Call `getEntitiesByType` for `'character'`, `'location'`, `'object'` and format as `` `WORLD:\n${entities.map(e => `- ${e.name} (${e.type})`).join('\n')}` ``.
  4. Pass formatted strings as second args to `validate` and `generateChoices`.
  5. In `generate.controller.spec.ts`: add `import { GraphService } from './graph.service'` at the top; add `{ provide: GraphService, useValue: { getEntitiesByType: jest.fn() } }` to the providers in **all** existing `beforeEach` blocks (top-level and `stream SSE endpoint`); update the existing assertion `toHaveBeenCalledWith('Once upon a time...')` to `toHaveBeenCalledWith('Once upon a time...', expect.any(String))`.
- **Files touched**: `src/generate/generate.controller.ts`, `src/generate/generate.controller.spec.ts`

## REFACTOR
none
