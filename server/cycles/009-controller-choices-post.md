---
id: cycle-009
slug: controller-choices-post
status: pending
source: "cycle-009 spec — GenerateController.generate() uses ChoiceGeneratorService instead of hardcoded choices"
covers: happy-path
---

## Behavior
After a successful narrative generation, `GenerateController.generate()` calls `choiceGeneratorService.generateChoices(narrative)` and returns its result as the `choices` field, replacing the hardcoded `['Investigate', 'Flee', 'Negotiate']` array. The shape of each choice object is now `{ label: string, entities: string[], rules: string[] }`.

## RED
- **Test file**: `src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  import { Test, TestingModule } from '@nestjs/testing'
  import { GenerateController } from './generate.controller'
  import { NarrativeGeneratorService } from './narrative-generator.service'
  import { ActionValidatorService } from '../agents/action-validator.service'
  import { ChoiceGeneratorService } from '../agents/choice-generator.service'

  describe('GenerateController', () => {
    let controller: GenerateController
    let narrativeService: { generate: jest.Mock }
    let validatorService: { validate: jest.Mock }
    let choiceGeneratorService: { generateChoices: jest.Mock }

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn() } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn() } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn() } },
        ],
      }).compile()

      controller = module.get(GenerateController)
      narrativeService = module.get(NarrativeGeneratorService) as any
      validatorService = module.get(ActionValidatorService) as any
      choiceGeneratorService = module.get(ChoiceGeneratorService) as any
    })

    it('calls service with prompt and returns narrative and choices from choiceGeneratorService', async () => {
      narrativeService.generate.mockResolvedValueOnce('Once upon a time...')
      validatorService.validate.mockResolvedValueOnce({ result: 'accepted', reason: 'Fine.' })
      choiceGeneratorService.generateChoices.mockResolvedValueOnce([
        { label: 'Fight', entities: [], rules: [] },
      ])

      const result = await controller.generate({ prompt: 'Write beat 1' })

      expect(narrativeService.generate).toHaveBeenCalledWith('Write beat 1')
      expect(choiceGeneratorService.generateChoices).toHaveBeenCalledWith('Once upon a time...')
      expect(result).toEqual({
        narrative: 'Once upon a time...',
        choices: [{ label: 'Fight', entities: [], rules: [] }],
      })
    })

    it('returns rejected response without calling narrativeService when validator rejects', async () => {
      validatorService.validate.mockResolvedValueOnce({
        result: 'rejected',
        reason: 'Cannot phase through walls.',
      })

      const result = await controller.generate({ prompt: 'Walk through wall' })

      expect(narrativeService.generate).not.toHaveBeenCalled()
      expect(result).toEqual({ rejected: true, reason: 'Cannot phase through walls.' })
    })
  })
  ```
- **Why it fails**: `GenerateController.generate()` returns the hardcoded array `['Investigate', 'Flee', 'Negotiate']` — the assertion expects `[{ label: 'Fight', entities: [], rules: [] }]` from the mock, which will not match. Additionally `ChoiceGeneratorService` is not yet a constructor dependency of `GenerateController`, so `generate()` never calls `choiceGeneratorService.generateChoices`, which the `toHaveBeenCalledWith` assertion catches.

> **Scope note**: The SSE describe block is excluded here — it is the concern of cycle 010. This cycle changes exactly one thing in `generate()`: swap the hardcoded array for a `choiceGeneratorService.generateChoices(narrative)` call.

## GREEN
- **Smallest change**: Update `generate.controller.ts` — add `ChoiceGeneratorService` to the constructor (alongside the `ActionValidatorService` added in cycle-008). In `generate()`, after `narrativeService.generate(body.prompt)` resolves, call `const choices = await this.choiceGeneratorService.generateChoices(narrative)` and return `{ narrative, choices }` instead of the hardcoded array. Leave `stream()` unchanged.
- **Files touched**: `src/generate/generate.controller.ts`, `src/generate/generate.controller.spec.ts`

## REFACTOR
none
