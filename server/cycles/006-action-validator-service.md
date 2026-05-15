---
id: cycle-006
slug: action-validator-service
status: done
source: "cycle-006 spec — ActionValidatorService wrapping Mastra Agent via injection token"
covers: happy-path
---

## Behavior
`ActionValidatorService.validate(action)` calls a Mastra `Agent` instance injected via the token `ACTION_VALIDATOR_AGENT`, passing the action string and an inline zod schema for structured output, and returns the parsed `{ result, reason, modifiedAction? }` object. The service does not instantiate the agent itself — it receives it through DI.

## RED
- **Test file**: `src/agents/action-validator.service.spec.ts`
- **Assertion**:
  ```ts
  import { Test, TestingModule } from '@nestjs/testing'
  import { ActionValidatorService } from './action-validator.service'

  describe('ActionValidatorService', () => {
    let service: ActionValidatorService

    describe('validate — accepted result', () => {
      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ActionValidatorService,
            {
              provide: 'ACTION_VALIDATOR_AGENT',
              useValue: {
                generate: jest.fn().mockResolvedValueOnce({
                  object: { result: 'accepted', reason: 'Plausible action.' },
                }),
              },
            },
          ],
        }).compile()

        service = module.get(ActionValidatorService)
      })

      it('returns the parsed object from agent.generate', async () => {
        const outcome = await service.validate('I pick the lock')
        expect(outcome).toEqual({ result: 'accepted', reason: 'Plausible action.' })
      })
    })

    describe('validate — rejected result with modifiedAction undefined', () => {
      let agentMock: { generate: jest.Mock }

      beforeEach(async () => {
        agentMock = {
          generate: jest.fn().mockResolvedValueOnce({
            object: { result: 'rejected', reason: 'Impossible.', modifiedAction: undefined },
          }),
        }
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ActionValidatorService,
            { provide: 'ACTION_VALIDATOR_AGENT', useValue: agentMock },
          ],
        }).compile()

        service = module.get(ActionValidatorService)
      })

      it('passes the object through including undefined modifiedAction', async () => {
        const outcome = await service.validate('Phase through the wall')
        expect(outcome).toEqual({
          result: 'rejected',
          reason: 'Impossible.',
          modifiedAction: undefined,
        })
        expect(agentMock.generate).toHaveBeenCalledWith(
          'Phase through the wall',
          expect.objectContaining({ output: expect.anything() }),
        )
      })
    })
  })
  ```
- **Why it fails**: `ActionValidatorService` does not exist — the import will fail at compile time.

## GREEN
- **Smallest change**: Create `src/agents/action-validator.service.ts` — an `@Injectable()` class that receives `@Inject('ACTION_VALIDATOR_AGENT') private readonly agent: Agent` (imported from `@mastra/core/agent`). Define an inline zod schema `z.object({ result: z.enum(['accepted', 'modified', 'rejected']), reason: z.string(), modifiedAction: z.string().optional() })`. Implement `async validate(action: string)` which calls `this.agent.generate(action, { output: schema })` and returns `result.object`.
- **Files touched**: `src/agents/action-validator.service.ts`

## REFACTOR
none
