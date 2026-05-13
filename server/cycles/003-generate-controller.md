---
id: cycle-003
slug: generate-controller
status: done
source: "Day-2 Section 4 — POST /api/generate endpoint"
covers: happy-path
group: day2-endpoint
---

## Behavior
`GenerateController` exposes `POST /generate`. It accepts `{ prompt: string }` in the request body via an exported `GenerateRequestDto` class (plain class, no validators — input validation is out of scope for this cycle), calls `NarrativeGeneratorService.generate(prompt)`, and returns `{ narrative: string, choices: string[] }` where `choices` is the hardcoded array `['Investigate', 'Flee', 'Negotiate']`.

## RED
- **Test file**: `server/src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  import { Test, TestingModule } from '@nestjs/testing'
  import { GenerateController } from './generate.controller'
  import { NarrativeGeneratorService } from './narrative-generator.service'

  describe('GenerateController', () => {
    let controller: GenerateController
    let service: NarrativeGeneratorService

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn() } },
        ],
      }).compile()

      controller = module.get(GenerateController)
      service = module.get(NarrativeGeneratorService)
    })

    it('calls service with prompt and returns narrative and choices', async () => {
      const generateMock = service.generate as jest.Mock
      generateMock.mockResolvedValueOnce('Once upon a time...')

      const result = await controller.generate({ prompt: 'Write beat 1' })

      expect(generateMock).toHaveBeenCalledWith('Write beat 1')
      expect(result).toEqual({
        narrative: 'Once upon a time...',
        choices: ['Investigate', 'Flee', 'Negotiate'],
      })
    })
  })
  ```
- **Why it fails**: `generate.controller.ts` does not exist — ts-jest throws a module-not-found error at load time, causing the entire suite to abort with zero tests reported.

## GREEN
- **Smallest change**: Create `generate.controller.ts` first (step A), then add `GenerateController` to `GenerateModule.controllers` (step B) — this ordering ensures the existing `generate.module.spec.ts` stays green throughout.
  - Step A: `export class GenerateRequestDto { prompt: string }`. `GenerateController` with `@Controller('generate')`, one `@Post()` handler `generate(@Body() body: GenerateRequestDto)` calling `narrativeService.generate(body.prompt)` and returning `{ narrative, choices: ['Investigate', 'Flee', 'Negotiate'] }`.
  - Step B: Add `controllers: [GenerateController]` to `GenerateModule`. The controller belongs in `GenerateModule` because it is the HTTP surface of that feature slice; `AppModule` picks it up automatically by importing `GenerateModule`.
- **Files touched**:
  - `server/src/generate/generate.controller.ts` (new)
  - `server/src/generate/generate.module.ts` (add `controllers: [GenerateController]`)

## REFACTOR
none

> **Out-of-band wiring (untested):** Add `app.setGlobalPrefix('api')` in `main.ts` so the endpoint is reachable at `POST /api/generate`. This changes observable behavior and should be covered by an e2e cycle when e2e infrastructure is in place; for now it is a manual wiring step.
