---
id: cycle-010
slug: engine-pre-generate-happy
status: done
source: "Day 9: Pre-generation delta application — user action → graph mutation before narrative generation"
covers: happy-path
group: engine-pre-generate
---

## Dependencies

**(none — all dependencies mocked via Test.createTestingModule)**

## Behavior
`GenerateController.generate()` accepts an optional `deltas?: Delta[]` in the request body DTO. When deltas are present, it calls `await this.engineService.processDeltas(body.deltas, defaultSpec)` before `buildContexts()`, ensuring the graph state is updated before semantic recall runs. `defaultSpec` is the default `UpdateSpec` imported from `server/src/config/update-spec.json`. A full `Test.createTestingModule` controller test is required because the controller class carries `@UseFilters` and `@UseInterceptors` at class level (per controller-vs-service rule (b)). Integration smoke: see cycle-011 (last in group).

## RED
- **Test file**: `server/src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  // Added to the existing describe('GenerateController') block
  import { EngineService } from './engine.service';

  it('calls engineService.processDeltas with body.deltas before generating narrative', async () => {
    const processDeltas = jest.fn().mockResolvedValue({ flaggedForReEmbed: [] });
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: EngineService, useValue: { processDeltas } },
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('narrative'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockResolvedValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
      ],
    }).compile();

    const delta = { op: 'state_mutation' as const, entityId: 'e1', patch: { hp: 50 } };
    await mod.get(GenerateController).generate({ prompt: 'test', deltas: [delta] });

    expect(processDeltas).toHaveBeenCalledWith([delta], expect.any(Object));
  });
  ```
- **Why it fails**: `GenerateController` does not inject `EngineService`; `GenerateRequestDto` has no `deltas` field; the `Test.createTestingModule` cannot resolve the `EngineService` token.

## GREEN
- **Smallest change**: Add `deltas?: Delta[]` field to `GenerateRequestDto` (import `Delta` type from `../upload/extractor.service`). Inject `private readonly engineService: EngineService` into `GenerateController` constructor. At the start of `generate()`, add `if (body.deltas?.length) { await this.engineService.processDeltas(body.deltas, defaultSpec); }`. Create `server/src/config/update-spec.json` with `{ "variables": { "hp": { "min": 0, "max": 100 } }, "cascades": [] }`. Import and assign `defaultSpec` at the top of `generate.controller.ts`. Ensure `EngineService` remains in `GenerateModule` providers.
- **Files touched**: `server/src/generate/generate.controller.ts`, `server/src/config/update-spec.json` (new)

## REFACTOR
none
