---
id: cycle-002-004
slug: services
status: pending
source: "Day-2 Section 3 — Services: generate(), stub services, GenerateModule"
covers: happy-path
group: day2-services
---

---

## cycle-002 — narrative-generator-generate

### Behavior
`NarrativeGeneratorService.generate(prompt)` calls `this.client.chat.completions.create` with a system prompt and the user's prompt, returning the content string from the first choice. GREEN implements the smallest possible version with the system prompt inlined. REFACTOR then extracts the prompt content into proper config files at `server/src/config/`.

### RED
- **Test file**: `server/src/generate/narrative-generator.service.spec.ts`
- **Assertion**:
  ```ts
  describe('generate', () => {
    let module: TestingModule

    afterEach(async () => {
      await module.close()
    })

    it('calls OpenAI with system + user prompt and returns content', async () => {
      module = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          { provide: ConfigService, useValue: makeConfigMock(() => 'test-key') },
        ],
      }).compile()

      const service = module.get(NarrativeGeneratorService)
      const createSpy = jest
        .spyOn((service as any).client.chat.completions, 'create')
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Once upon a time...' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        } as any)

      const result = await service.generate('Write beat 1')

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            { role: 'user', content: 'Write beat 1' },
          ]),
        }),
      )
      expect(result).toBe('Once upon a time...')
    })
  })
  ```
- **Why it fails**: `generate` method does not exist on `NarrativeGeneratorService`.

### GREEN
- **Smallest change**: Add `generate(prompt: string): Promise<string>` to `NarrativeGeneratorService` with an inlined system prompt string (no config files yet). Add private `buildSystemPrompt(): string` returning a hardcoded string. The test only checks for `{ role: 'system' }` presence — it does not assert prompt content.
- **Files touched**: `server/src/generate/narrative-generator.service.ts` only

### REFACTOR
Create `server/src/config/meta-directives.ts` and `server/src/config/style-guide.ts` (mirrors of the day-1 configs), then replace the inlined string in `buildSystemPrompt()` with interpolation from those config objects. All tests must remain green.

---

## cycle-003 — stub-services

### Behavior
Three new stub services are created — `GraphService`, `StateService`, `EngineService` — each with one method returning a hardcoded value. They exist as injectable placeholders that will be replaced with real implementations on Days 5–9.

### RED
- **Test file**: `server/src/generate/stub-services.spec.ts`
- **Assertion**:
  ```ts
  import { GraphService } from './graph.service'
  import { StateService } from './state.service'
  import { EngineService } from './engine.service'

  describe('GraphService', () => {
    it('getEntities returns an array', () => {
      expect(Array.isArray(new GraphService().getEntities())).toBe(true)
    })
  })

  describe('StateService', () => {
    it('getState returns object containing the sessionId', () => {
      expect(new StateService().getState('session-1')).toMatchObject({ sessionId: 'session-1' })
    })
  })

  describe('EngineService', () => {
    it('process returns input unchanged', async () => {
      const input = { narrative: 'test', choices: [] }
      await expect(new EngineService().process(input)).resolves.toEqual(input)
    })
  })
  ```
- **Why it fails**: None of the three service files exist; imports fail immediately.

### GREEN
- **Smallest change**: Create the three stub service files with `@Injectable()` and the one method each.
- **Files touched**:
  - `server/src/generate/graph.service.ts` (new)
  - `server/src/generate/state.service.ts` (new)
  - `server/src/generate/engine.service.ts` (new)

### REFACTOR
none

---

## cycle-004 — generate-module

### Behavior
A new `GenerateModule` registers all four services (`NarrativeGeneratorService`, `GraphService`, `StateService`, `EngineService`) as providers. The test proves the NestJS DI container can resolve each service when the module is compiled.

### RED
- **Test file**: `server/src/generate/generate.module.spec.ts`
- **Assertion**:
  ```ts
  import { Test, TestingModule } from '@nestjs/testing'
  import { ConfigService } from '@nestjs/config'
  import { GenerateModule } from './generate.module'
  import { NarrativeGeneratorService } from './narrative-generator.service'
  import { GraphService } from './graph.service'
  import { StateService } from './state.service'
  import { EngineService } from './engine.service'

  describe('GenerateModule', () => {
    let module: TestingModule

    afterEach(async () => {
      await module.close()
    })

    it('compiles and resolves all services', async () => {
      module = await Test.createTestingModule({
        imports: [GenerateModule],
      })
        .overrideProvider(ConfigService)
        .useValue({ getOrThrow: jest.fn().mockReturnValue('test-key'), get: jest.fn() })
        .compile()

      expect(module.get(NarrativeGeneratorService)).toBeDefined()
      expect(module.get(GraphService)).toBeDefined()
      expect(module.get(StateService)).toBeDefined()
      expect(module.get(EngineService)).toBeDefined()
    })
  })
  ```
- **Why it fails**: `GenerateModule` does not exist; the import fails immediately.

### GREEN
- **Smallest change**: Create `server/src/generate/generate.module.ts` declaring all four services as providers and importing `ConfigModule`.
- **Files touched**: `server/src/generate/generate.module.ts` (new)

### REFACTOR
> **Note — out-of-band wiring step (untested):** Import `GenerateModule` into `AppModule` so the real application wires up correctly. This is production wiring with no test covering it at this stage — it is not a structural refactor. A future integration/e2e cycle should cover full `AppModule` compilation.
