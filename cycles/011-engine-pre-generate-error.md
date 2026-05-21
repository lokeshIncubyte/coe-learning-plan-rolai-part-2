---
id: cycle-011
slug: engine-pre-generate-error
status: done
source: "Day 9: Pre-generation delta application — engine failure propagates from controller"
covers: error-path
group: engine-pre-generate
---

## Dependencies

**(none — all dependencies mocked)**

## Behavior
When `engineService.processDeltas()` throws, `GenerateController.generate()` propagates the error to NestJS's exception filter pipeline (the `OpenAiExceptionFilter` or a default 500). Narrative generation does not proceed. Integration smoke (pre-squash gate for engine-pre-generate group): POST `/generate` with a `deltas` array containing a `state_mutation` for a non-existent entityId — verify the response status is 500 (or filter-mapped) and no narrative is returned.

## RED
- **Test file**: `server/src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  it('propagates error when engineService.processDeltas throws', async () => {
    const processDeltas = jest.fn().mockRejectedValue(new Error('engine failure'));
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: EngineService, useValue: { processDeltas } },
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn(), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockResolvedValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
      ],
    }).compile();

    await expect(
      mod.get(GenerateController).generate({
        prompt: 'test',
        deltas: [{ op: 'state_mutation', entityId: 'bad-id', patch: { hp: 10 } }],
      }),
    ).rejects.toThrow('engine failure');
  });
  ```
- **Why it fails**: `GenerateController` does not inject `EngineService` and `GenerateRequestDto.deltas` doesn't exist until cycle-010 GREEN is applied.

## GREEN
- **Smallest change**: No additional code beyond cycle-010 GREEN — `processDeltas` rejection propagates naturally since there is no try/catch around the delta application call in `generate()`.
- **Files touched**: `server/src/generate/generate.controller.ts` (no change beyond cycle-010)

## REFACTOR
none
