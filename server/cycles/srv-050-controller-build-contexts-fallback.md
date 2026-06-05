---
id: srv-050
slug: controller-build-contexts-fallback
status: done
source: "Day 7 — GenerateController: getAllEntitiesWithEdges fallback when semanticRecall returns empty"
covers: error-path
group: controller-semantic-retrieval
---

## Behavior
When `graphService.semanticRecall` returns zero entities (e.g., embeddings not yet generated or the vector index is empty), `buildContexts` falls back to `graphService.getAllEntitiesWithEdges()` to ensure generation stays grounded in the world. This prevents an empty `worldContext` from being sent to the model when the entity graph exists but has no embeddings yet. The fallback also resets `anchorId` to the first entity's ID so traversal has a valid starting point.

## RED
- **Test file**: `src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  it('falls back to getAllEntitiesWithEdges when semanticRecall returns no entities', async () => {
    const getAllEntitiesWithEdges = jest.fn().mockResolvedValue([
      { id: 'e1', name: 'Mira', type: 'character', state: {}, fromEdges: [], toEdges: [] },
    ]);
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('story'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: {
            semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }),
            getAllEntitiesWithEdges,
            getEntitiesByType: jest.fn().mockResolvedValue([]),
        }},
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
      ],
    }).compile();

    await mod.get(GenerateController).generate({ prompt: 'test' });

    expect(getAllEntitiesWithEdges).toHaveBeenCalled();
  });
  ```
- **Why it fails**: after srv-049's GREEN, `buildContexts` calls `semanticRecall` but has no fallback — when it returns empty entities the controller proceeds with an empty world context instead of calling `getAllEntitiesWithEdges`.

## GREEN
- **Smallest change**: In `buildContexts`, immediately after `semanticRecall` resolves and `allEntities` is set from `entities`, add: `if (allEntities.length === 0) { allEntities = await this.graphService.getAllEntitiesWithEdges(); anchorId = allEntities[0]?.id ?? ''; }`. This is the minimal guard that activates the full-graph fallback when the vector index is empty.
- **Files touched**: `src/generate/generate.controller.ts`

## REFACTOR
none
