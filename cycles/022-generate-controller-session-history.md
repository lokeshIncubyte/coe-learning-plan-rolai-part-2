---
id: cycle-022
slug: generate-controller-session-history
status: pending
source: "§2+§4 GenerationHistory logging fix + Session model wiring in GenerateController"
covers: happy-path
group: history-logging
---

## Dependencies

### Prisma
Model: Session, GenerationHistory
Required fields for GenerationHistory: sessionId, narrative, anchor
```
export type SessionCreateInput = { id?: string; createdAt?: Date | string }
export type GenerationHistoryUncheckedCreateInput = {
  id?: string; sessionId: string; narrative: string; anchor: string
  deltas?: JsonNullValueInput | InputJsonValue; createdAt?: Date | string
}
```

**(none — controller test mocks SessionService and HistoryService via DI)**

## Behavior
`GenerateController.generate()` creates a Session via SessionService before generating, then calls HistoryService.logEntry with sessionId, narrative, anchorId, and the incoming deltas after generation completes. The controller must inject SessionService and HistoryService. This is the last cycle in the history-logging group.

Integration smoke: `POST /api/generate` against real DB (real PrismaService, real SessionService, real HistoryService) creates one Session row and one GenerationHistory row each call.

## RED
- **Test file**: `src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  import { Test, TestingModule } from '@nestjs/testing'
  import { GenerateController } from './generate.controller'
  import { NarrativeGeneratorService } from './narrative-generator.service'
  import { ActionValidatorService } from '../agents/action-validator.service'
  import { ChoiceGeneratorService } from '../agents/choice-generator.service'
  import { GraphService } from './graph.service'
  import { TraversalService } from './traversal.service'
  import { RuleEvaluatorService } from './rule-evaluator.service'
  import { EngineService } from './engine.service'
  import { EmbeddingService } from './embedding.service'
  import { SessionService } from './session.service'
  import { HistoryService } from './history.service'

  describe('GenerateController — session + history wiring', () => {
    it('calls sessionService.createSession and historyService.logEntry on each generate call', async () => {
      const createSession = jest.fn().mockResolvedValue('sess-xyz')
      const logEntry = jest.fn().mockResolvedValue(undefined)

      const module: TestingModule = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('A tale.'), stream: jest.fn() } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'approved' }) } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue(['Go left']) } },
          { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [{ id: 'e1', name: 'Cave', type: 'location', state: {} }], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockReturnValue([]) } },
          { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
          { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
          { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
          { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
          { provide: SessionService, useValue: { createSession } },
          { provide: HistoryService, useValue: { logEntry } },
        ],
      }).compile()

      const controller = module.get(GenerateController)
      await controller.generate({ prompt: 'I explore.' })

      expect(createSession).toHaveBeenCalledTimes(1)
      expect(logEntry).toHaveBeenCalledWith('sess-xyz', 'A tale.', 'e1', [])
    })
  })
  ```
- **Why it fails**: `GenerateController` does not inject `SessionService` or `HistoryService`, and does not call them.

## GREEN
- **Smallest change**: Add `SessionService` and `HistoryService` to `GenerateController` constructor. In `generate()`, call `const sessionId = await this.sessionService.createSession()` before generation, then `await this.historyService.logEntry(sessionId, narrative, anchorId, body.deltas ?? [])` after getting the narrative. Register both in `generate.module.ts` providers.
- **Files touched**: `src/generate/generate.controller.ts`, `src/generate/generate.module.ts`

## REFACTOR
none
