---
id: srv-008
slug: controller-validator-reject
status: skip
source: "srv-008 spec — GenerateController.generate() early-returns when ActionValidatorService rejects"
covers: error-path
---

## Behavior
`GenerateController.generate()` now depends on `ActionValidatorService` and `ChoiceGeneratorService`. When the validator returns `result: 'rejected'`, the handler immediately returns `{ rejected: true, reason }` without calling `narrativeService.generate()`. The happy path (non-rejected) is unchanged.

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
- **Why it fails**: Two reasons — (1) `ActionValidatorService` and `ChoiceGeneratorService` do not exist yet, so the imports fail at compile time; (2) even if the files existed, `GenerateController` has no `ActionValidatorService` dependency and no early-return logic, so calling `controller.generate({ prompt: 'Walk through wall' })` would call `narrativeService.generate` normally — making `expect(narrativeService.generate).not.toHaveBeenCalled()` fail.

> **Scope note**: The SSE tests and the happy-path choices tests are deliberately excluded from this cycle — they belong to cycles 009 and 010 respectively, which each add exactly one new behaviour. This cycle's RED exercises only the `rejected` early-return path.

## GREEN
- **Smallest change**: Update `generate.controller.ts` — add only `ActionValidatorService` to the constructor (NestJS ignores extra providers in test modules, so `ChoiceGeneratorService` does not need to be wired yet). In `generate()`, call `const outcome = await this.validatorService.validate(body.prompt)` before calling `narrativeService.generate`. If `outcome.result === 'rejected'`, return `{ rejected: true, reason: outcome.reason }` immediately. Leave the happy path and `stream()` unchanged.
- **Files touched**: `src/generate/generate.controller.ts`, `src/generate/generate.controller.spec.ts`

## REFACTOR
none
