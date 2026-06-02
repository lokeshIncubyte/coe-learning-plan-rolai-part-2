---
id: cycle-050
slug: generate-returns-modified-action
status: done
source: "modified validation status never set in UI — server side: generate() must expose modifiedAction in its response"
covers: happy-path
group: generate-modified
---

## Dependencies

**(none — pure logic cycle)** All mocked services (`ActionValidatorService`, `SessionService`, `HistoryService`, etc.) have `.spec.ts` peers in `src/` so no external boundary fires.

## Behavior

When `ActionValidatorService.validate()` returns `{ result: 'modified', modifiedAction }`, `GenerateController.generate()` currently ignores the `modifiedAction` field in its return value. After this cycle it returns `{ narrative, choices, sessionId, modifiedAction }` so the client can detect modification and display the correct feedback status.

## RED
- **Test file**: `server/src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  it('generate returns modifiedAction when validator returns modified', async () => {
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('narrative'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'modified', modifiedAction: 'safe action' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockReturnValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile()
    const ctrl = mod.get(GenerateController)
    const result = await ctrl.generate({ prompt: 'dangerous action' })
    expect(result).toMatchObject({ modifiedAction: 'safe action' })
  })
  ```
- **Why it fails**: `generate()` returns `{ narrative, choices, sessionId }` — no `modifiedAction` field (even after cycle-049).

## GREEN
- **Smallest change**: In `generate.controller.ts`, after resolving `effectivePrompt`, capture `modifiedAction` and include it in the return:
  ```ts
  const modifiedAction = outcome.result === 'modified' ? outcome.modifiedAction : undefined
  // ... existing narrative generation ...
  return { narrative, choices, sessionId, ...(modifiedAction ? { modifiedAction } : {}) }
  ```
- **Files touched**: `server/src/generate/generate.controller.ts`

## REFACTOR
none
