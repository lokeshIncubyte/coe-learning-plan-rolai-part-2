---
id: cycle-024
slug: generate-controller-writeback-error-skip
status: pending
source: "§3 Full Pipeline + §6 Error Handling — extractor parse failure skips write-back, stream continues"
covers: error-path
group: extractor-writeback
---

## Dependencies

### Package
ExtractorService — `extractDeltas(chunk: string): Promise<Delta[]>`
Throws a generic Error when LLM returns malformed JSON.

**(none — pure controller logic; no new external boundaries beyond cycle-023)**

## Behavior
When `extractorService.extractDeltas(narrative)` throws, `GenerateController.generate()` logs the error but does not propagate it — the response still returns `{ narrative, choices }` normally. Write-back is skipped; state is not corrupted.

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

  describe('GenerateController — write-back error skip', () => {
    it('returns narrative and choices even when extractDeltas throws', async () => {
      const extractDeltas = jest.fn().mockRejectedValue(new Error('Malformed JSON from LLM'))

      const module: TestingModule = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('The dragon retreats.'), stream: jest.fn() } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'approved' }) } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue(['Pursue', 'Rest']) } },
          { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockReturnValue([]) } },
          { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
          { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
          { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
          { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
          { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-1') } },
          { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
          { provide: ExtractorService, useValue: { extractDeltas } },
        ],
      }).compile()

      const controller = module.get(GenerateController)
      const result = await controller.generate({ prompt: 'Chase it.' })

      expect(result).toEqual({ narrative: 'The dragon retreats.', choices: ['Pursue', 'Rest'] })
    })
  })
  ```
- **Why it fails**: `GenerateController` does not yet catch `extractDeltas` errors (cycle-023 wires it but without try/catch).

## GREEN
- **Smallest change**: Wrap the `extractDeltas` + write-back block in a try/catch that logs but does not rethrow. Use `this.logger.warn(...)` or `console.warn(...)`.
- **Files touched**: `src/generate/generate.controller.ts`

## REFACTOR
none
