---
id: cycle-023
slug: generate-controller-extractor-writeback
status: done
source: "§3 Full Pipeline step 8-9 — Extractor parse + write-back via EngineService.processDeltas"
covers: happy-path
group: extractor-writeback
---

## Dependencies

### Package
ExtractorService has a `.spec.ts` peer (`src/upload/extractor.service.spec.ts`) but calls OpenAI internally — treat as external boundary for boundary-audit.
```
extractDeltas(chunk: string): Promise<Delta[]>
```
Delta types:
```ts
export type NewEntityDelta = { op: 'new_entity'; identity: { name: string; type: string; archetype?: string; backstory?: string; role?: string }; state: Record<string, unknown> }
export type IdentityShiftDelta = { op: 'identity_shift'; entityId: string; patch: Partial<{...}> }
export type StateMutationDelta = { op: 'state_mutation'; entityId: string; patch: Record<string, unknown> }
export type Delta = NewEntityDelta | IdentityShiftDelta | StateMutationDelta | NewEdgeDelta
```

## Behavior
After narrative generation, `GenerateController.generate()` calls `extractorService.extractDeltas(narrative)` then passes the result to `engineService.processDeltas(extractedDeltas, spec)` to write back LLM-inferred mutations. The controller injects `ExtractorService`. This is the last cycle in the extractor-writeback group.

Integration smoke: POST /api/generate with a prompt referencing new entities — after the call, at least one Entity row appears in the DB (created via write-back path with real ExtractorService and real EngineService).

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
  import { ExtractorService } from '../upload/extractor.service'
  import type { Delta } from '../upload/extractor.service'

  describe('GenerateController — extractor write-back', () => {
    it('calls extractorService.extractDeltas then engineService.processDeltas with extracted deltas', async () => {
      const extractedDeltas: Delta[] = [{ op: 'state_mutation', entityId: 'e1', patch: { hp: 80 } }]
      const extractDeltas = jest.fn().mockResolvedValue(extractedDeltas)
      const processDeltas = jest.fn().mockResolvedValue({ flaggedForReEmbed: [] })

      const module: TestingModule = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('The hero fights.'), stream: jest.fn() } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'approved' }) } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
          { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockReturnValue([]) } },
          { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
          { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
          { provide: EngineService, useValue: { processDeltas } },
          { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
          { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-1') } },
          { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
          { provide: ExtractorService, useValue: { extractDeltas } },
        ],
      }).compile()

      const controller = module.get(GenerateController)
      await controller.generate({ prompt: 'Attack the dragon.' })

      expect(extractDeltas).toHaveBeenCalledWith('The hero fights.')
      expect(processDeltas).toHaveBeenCalledTimes(1)
      const secondCall = processDeltas.mock.calls[0]
      expect(secondCall[0]).toEqual(extractedDeltas)
    })
  })
  ```
- **Why it fails**: `GenerateController` does not inject `ExtractorService` and does not call `extractDeltas` after narrative generation.

## GREEN
- **Smallest change**: Add `ExtractorService` to `GenerateController` constructor. After getting `narrative`, call `const extractedDeltas = await this.extractorService.extractDeltas(narrative)` then `await this.engineService.processDeltas(extractedDeltas, defaultSpec)`. Add `ExtractorService` to `generate.module.ts` providers (import from `../upload/extractor.service`).
- **Files touched**: `src/generate/generate.controller.ts`, `src/generate/generate.module.ts`

## REFACTOR
none
