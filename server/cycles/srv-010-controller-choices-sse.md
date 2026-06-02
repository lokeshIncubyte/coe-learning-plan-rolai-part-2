---
id: srv-010
slug: controller-choices-sse
status: skip
source: "srv-010 spec — SSE stream() accumulates tokens, calls generateChoices, emits structured choices"
covers: happy-path
---

## Behavior
The SSE `stream()` handler accumulates all yielded tokens into `fullNarrative`, then calls `choiceGeneratorService.generateChoices(fullNarrative)` after the stream ends and emits the result as the `choices` event payload. The hardcoded `['Investigate', 'Flee', 'Negotiate']` array is removed; choices are now driven by the service.

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

    describe('stream SSE endpoint', () => {
      let controller: GenerateController
      let narrativeService: { generate: jest.Mock; stream: jest.Mock }
      let validatorService: { validate: jest.Mock }
      let choiceGeneratorService: { generateChoices: jest.Mock }

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          controllers: [GenerateController],
          providers: [
            {
              provide: NarrativeGeneratorService,
              useValue: { generate: jest.fn(), stream: jest.fn() },
            },
            { provide: ActionValidatorService, useValue: { validate: jest.fn() } },
            { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn() } },
          ],
        }).compile()

        controller = module.get(GenerateController)
        narrativeService = module.get(NarrativeGeneratorService) as any
        validatorService = module.get(ActionValidatorService) as any
        choiceGeneratorService = module.get(ChoiceGeneratorService) as any
      })

      it('emits start, chunk, done, and choices MessageEvents in order — choices from generateChoices', async () => {
        async function* fakeTokens() {
          yield 'Hello'
          yield ' world'
        }
        narrativeService.stream.mockImplementation(() => fakeTokens())
        choiceGeneratorService.generateChoices.mockResolvedValueOnce([
          { label: 'Run', entities: [], rules: [] },
        ])

        const observable = controller.stream({ prompt: 'test' })
        const events: any[] = []
        await new Promise<void>((resolve, reject) => {
          observable.subscribe({
            next: (e) => events.push(e.data),
            error: reject,
            complete: resolve,
          })
        })

        expect(choiceGeneratorService.generateChoices).toHaveBeenCalledWith('Hello world')
        expect(events).toEqual([
          { type: 'start' },
          { type: 'chunk', content: 'Hello' },
          { type: 'chunk', content: ' world' },
          { type: 'done' },
          { type: 'choices', choices: [{ label: 'Run', entities: [], rules: [] }] },
        ])
      })

      it('emits error event and completes when stream throws', async () => {
        async function* failingStream() {
          yield 'partial'
          throw new Error('OpenAI blew up')
        }
        narrativeService.stream.mockImplementation(() => failingStream())

        const observable = controller.stream({ prompt: 'test' })
        const events: any[] = []
        await new Promise<void>((resolve, reject) => {
          observable.subscribe({
            next: (e) => events.push(e.data),
            error: reject,
            complete: resolve,
          })
        })

        expect(events).toEqual([
          { type: 'start' },
          { type: 'chunk', content: 'partial' },
          { type: 'error', message: 'OpenAI blew up' },
        ])
      })

      it('passes AbortSignal to the service and aborts on unsubscribe', () => {
        let capturedSignal: AbortSignal | undefined
        async function* twoTokens() { yield 'a'; yield 'b' }
        narrativeService.stream.mockImplementation((_prompt: string, signal: AbortSignal) => {
          capturedSignal = signal
          return twoTokens()
        })

        const sub = controller.stream({ prompt: 'test' }).subscribe(() => {})
        expect(capturedSignal).toBeDefined()
        expect(capturedSignal!.aborted).toBe(false)
        sub.unsubscribe()
        expect(capturedSignal!.aborted).toBe(true)
      })
    })
  })
  ```
- **Why it fails**: `stream()` in `generate.controller.ts` emits `choices: ['Investigate', 'Flee', 'Negotiate']` (hardcoded) and never calls `choiceGeneratorService.generateChoices` — the assertion expects `[{ label: 'Run', entities: [], rules: [] }]` and a `toHaveBeenCalledWith('Hello world')` check that cannot pass.

## GREEN
- **Smallest change**: Update `stream()` in `generate.controller.ts` — declare `let fullNarrative = ''` before the loop; inside the loop, after emitting each chunk, append the token to `fullNarrative`. After the loop (before emitting `done`), call `const choices = await this.choiceGeneratorService.generateChoices(fullNarrative)`. Emit `{ data: { type: 'done' } }` then `{ data: { type: 'choices', choices } }` instead of the hardcoded array.
- **Files touched**: `src/generate/generate.controller.ts`, `src/generate/generate.controller.spec.ts`

## REFACTOR
none
