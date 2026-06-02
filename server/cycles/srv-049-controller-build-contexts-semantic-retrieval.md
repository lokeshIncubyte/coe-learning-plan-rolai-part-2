---
id: srv-049
slug: controller-build-contexts-semantic-retrieval
status: done
source: "Day 7 — GenerateController: two-phase semantic retrieval in buildContexts"
covers: happy-path
group: controller-semantic-retrieval
---

## Behavior
`GenerateController.buildContexts(prompt)` replaces the three sequential `getEntitiesByType` calls with the two-phase retrieval pipeline: `graphService.semanticRecall(prompt, 8)` to get anchor entities and phase-1 scores, then `traversalService.traverse(anchorId, allEntities, 2)` for graph-walk ranking, then `traversalService.scoreWithSemantics(ranked, phase1Scores)` for final ordering. `TraversalService` and `RuleEvaluatorService` are injected into the controller. The `ruleContext` is built from `ruleEvaluator.evaluateRules(allEntities, rules)` outcomes including `conflictsWith` annotations. The `worldContext` string (WORLD block formatted from top-8 ranked entities) is passed to `narrativeService.generate(prompt, worldContext)`.

## RED
- **Test file**: `src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  it('calls graphService.semanticRecall with the prompt when building context', async () => {
    const semanticRecall = jest.fn().mockResolvedValue({ entities: [], scores: new Map() });
    const getAllEntitiesWithEdges = jest.fn().mockResolvedValue([]);
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('story'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall, getAllEntitiesWithEdges, getEntitiesByType: jest.fn().mockResolvedValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
      ],
    }).compile();

    await mod.get(GenerateController).generate({ prompt: 'test action' });

    expect(semanticRecall).toHaveBeenCalledWith('test action', 8);
  });
  ```
- **Why it fails**: `GenerateController` does not inject `TraversalService` or `RuleEvaluatorService`, and `buildContexts` calls `getEntitiesByType('character')` etc. instead of `semanticRecall`. Providing `TraversalService` and `RuleEvaluatorService` in the test module will cause NestJS to throw a missing-provider error until the constructor is updated. Additionally, the existing assertions at lines 33 and 56 (`toHaveBeenCalledWith('Write beat 1')` and `toHaveBeenCalledWith('safe action')`) will break once `generate` is called with two args `(effectivePrompt, worldContext)`, and the assertion at line 208 (`toHaveBeenCalledWith('adjusted action', expect.any(Object))`) will break once `stream` is called with three args `(effectivePrompt, signal, worldContext)`.

## GREEN
- **Smallest change**: Import `TraversalService` and `RuleEvaluatorService` and add them to the constructor. Change `buildContexts` signature to `private async buildContexts(prompt: string): Promise<{ ruleContext: string; worldContext: string; allEntities: any[] }>`. Rewrite the body: call `await this.graphService.semanticRecall(prompt, 8)` to get `{ entities, scores }`. Set `allEntities = entities`, `phase1ScoresMap = scores`, `anchorId = entities[0]?.id ?? ''`. Then: `const traversed = this.traversalService.traverse(anchorId, allEntities, 2)`, `const toRank = traversed.length ? traversed : allEntities.map(e => ({ ...e, proximityScore: 1, combinedScore: 1 }))`, `const ranked = this.traversalService.scoreWithSemantics(toRank, phase1ScoresMap)`. Fetch rules via `this.graphService.getEntitiesByType('rule')` and evaluate with `this.ruleEvaluator.evaluateRules(allEntities, rules)`. Build `worldContext` from top-8 ranked entities (name, type, archetype, state). Build `ruleContext` from active rules including `conflictsWith` annotations. Pass `worldContext` to `narrativeService.generate(effectivePrompt, worldContext)` and `narrativeService.stream(effectivePrompt, signal, worldContext)`. Update all call sites of `generate` and `stream` in the controller. Update `generate.module.ts` to provide `TraversalService` and `RuleEvaluatorService`. Reference the worktree `generate.controller.ts` `buildContexts` method, but exclude `ExtractorService`, `EngineService`, `GenerationHistoryService`, and `PipelineTelemetryService` — those belong to later days.
- **Files touched**: `src/generate/generate.controller.ts`, `src/generate/generate.controller.spec.ts`, `src/generate/generate.module.ts`

  **Existing assertions to update in `generate.controller.spec.ts`**:
  - Line 33: change `toHaveBeenCalledWith('Write beat 1')` → `toHaveBeenCalledWith('Write beat 1', expect.any(String))`
  - Line 56: change `toHaveBeenCalledWith('safe action')` → `toHaveBeenCalledWith('safe action', expect.any(String))`
  - Line 208: change `toHaveBeenCalledWith('adjusted action', expect.any(Object))` → `toHaveBeenCalledWith('adjusted action', expect.any(Object), expect.any(String))`

## REFACTOR
Extract the worldContext string-builder into a private `buildWorldContext(ranked: any[]): string` helper once the traversal pipeline stabilises.
