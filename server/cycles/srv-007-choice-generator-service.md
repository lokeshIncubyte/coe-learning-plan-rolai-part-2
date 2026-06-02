---
id: srv-007
slug: choice-generator-service
status: done
source: "srv-007 spec — ChoiceGeneratorService wrapping Mastra Agent + AgentsModule creation"
covers: happy-path
---

## Behavior
`ChoiceGeneratorService.generateChoices(narrative)` calls a Mastra `Agent` injected via the token `CHOICE_GENERATOR_AGENT`, passing the narrative string and an inline zod schema, and returns the parsed `Array<{ label: string, entities: string[], rules: string[] }>`. GREEN also creates `AgentsModule` with factory providers for both `ACTION_VALIDATOR_AGENT` and `CHOICE_GENERATOR_AGENT` tokens, and updates `GenerateModule` to import `AgentsModule`.

## RED
- **Test file**: `src/agents/choice-generator.service.spec.ts`
- **Assertion**:
  ```ts
  import { Test, TestingModule } from '@nestjs/testing'
  import { ChoiceGeneratorService } from './choice-generator.service'

  describe('ChoiceGeneratorService', () => {
    let service: ChoiceGeneratorService
    let agentMock: { generate: jest.Mock }

    beforeEach(async () => {
      agentMock = {
        generate: jest.fn().mockResolvedValue({
          object: {
            choices: [{ label: 'Investigate', entities: ['door'], rules: ['rule-1'] }],
          },
        }),
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ChoiceGeneratorService,
          { provide: 'CHOICE_GENERATOR_AGENT', useValue: agentMock },
        ],
      }).compile()

      service = module.get(ChoiceGeneratorService)
    })

    it('returns the parsed choices array from agent.generate', async () => {
      const choices = await service.generateChoices('narrative text')
      expect(choices).toEqual([{ label: 'Investigate', entities: ['door'], rules: ['rule-1'] }])
    })

    it('calls agent.generate with the narrative and a structured output schema', async () => {
      await service.generateChoices('narrative text')
      expect(agentMock.generate).toHaveBeenCalledWith(
        'narrative text',
        expect.objectContaining({ output: expect.anything() }),
      )
    })
  })
  ```
- **Why it fails**: `ChoiceGeneratorService` does not exist — the import will fail at compile time.

## GREEN
- **Smallest change**:
  1. Create `src/agents/choice-generator.service.ts` — `@Injectable()` class with `@Inject('CHOICE_GENERATOR_AGENT') private readonly agent: Agent`. Inline zod schema: `z.object({ choices: z.array(z.object({ label: z.string(), entities: z.array(z.string()), rules: z.array(z.string()) })) })`. Implement `async generateChoices(narrative: string)` which calls `this.agent.generate(narrative, { output: schema })` and returns `result.object.choices`.
- **Files touched**: `src/agents/choice-generator.service.ts`

> **Note — scope split**: Creating `src/agents/agents.module.ts` (factory providers for both agent tokens) and wiring it into `generate.module.ts` goes beyond what the RED test above requires. Those two wiring steps belong in a separate infrastructure cycle (e.g. srv-007b) so that this cycle stays atomic: one RED test → one file created.

## AGENTS MODULE (follow-on, out-of-cycle)
When both services pass their unit tests, create:
- `src/agents/agents.module.ts` — `@Module` importing `ConfigModule`; two `useFactory` providers: token `ACTION_VALIDATOR_AGENT` and `CHOICE_GENERATOR_AGENT`, each constructing `new Agent({ name, instructions, model })` using the `@ai-sdk/openai` provider configured with OpenRouter base URL read from `ConfigService`; exports both tokens and both service classes.
- Update `src/generate/generate.module.ts` — add `AgentsModule` to the `imports` array.

## REFACTOR
none
