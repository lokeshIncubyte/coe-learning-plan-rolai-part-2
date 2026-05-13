---
id: cycle-001
slug: narrative-generator-service-init
status: done
source: "Day-2 Setup — Verify environment variable loads correctly inside the NestJS app"
covers: happy-path + error-path
---

## Behavior
A new `NarrativeGeneratorService` calls `configService.getOrThrow('OPENROUTER_API_KEY')` in its constructor. When the key is present the service initialises cleanly; when the key is absent `getOrThrow` throws, which bubbles out of `Test.createTestingModule().compile()`. These are unit tests with mocked `ConfigService` — they verify the service's own guard logic, not the NestJS config pipeline end-to-end.

## RED

- **Test file**: `server/src/generate/narrative-generator.service.spec.ts`
- **Assertion**:
  ```ts
  import { Test } from '@nestjs/testing'
  import { ConfigService } from '@nestjs/config'
  import { NarrativeGeneratorService } from './narrative-generator.service'

  // Typed partial so future config.get() calls don't silently break tests
  const makeConfigMock = (getOrThrow: () => string): Partial<ConfigService> => ({
    getOrThrow: jest.fn().mockImplementation(getOrThrow),
    get: jest.fn(),
  })

  describe('NarrativeGeneratorService', () => {
    it('initialises when OPENROUTER_API_KEY is present', async () => {
      const module = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          { provide: ConfigService, useValue: makeConfigMock(() => 'test-key') },
        ],
      }).compile()

      expect(module.get(NarrativeGeneratorService)).toBeDefined()
    })

    it('throws on init when OPENROUTER_API_KEY is missing', async () => {
      await expect(
        Test.createTestingModule({
          providers: [
            NarrativeGeneratorService,
            {
              provide: ConfigService,
              useValue: makeConfigMock(() => {
                throw new Error('Config validation error: OPENROUTER_API_KEY is missing')
              }),
            },
          ],
        }).compile(),
      ).rejects.toThrow('OPENROUTER_API_KEY')
    })
  })
  ```
- **Why it fails**: `NarrativeGeneratorService` does not exist; the import fails immediately.

## GREEN

- **Smallest change**: Create `server/src/generate/` directory and `narrative-generator.service.ts` with a constructor that injects `ConfigService` and calls `config.getOrThrow<string>('OPENROUTER_API_KEY')`. Do not assign the return value yet — that is the REFACTOR step. No OpenAI client, no `generate()` method.

  ```ts
  import { Injectable } from '@nestjs/common'
  import { ConfigService } from '@nestjs/config'

  @Injectable()
  export class NarrativeGeneratorService {
    constructor(private readonly config: ConfigService) {
      config.getOrThrow<string>('OPENROUTER_API_KEY')
    }
  }
  ```

- **Files touched**: `server/src/generate/narrative-generator.service.ts` (new — create the `generate/` directory too)

## REFACTOR
Store the resolved key directly in the OpenAI client constructor rather than as a separate `this.apiKey` field. When the OpenAI client is introduced in the next cycle, write `this.client = new OpenAI({ apiKey: config.getOrThrow(...) })` in one step — this avoids keeping the raw key string as a standalone heap-resident field for the service lifetime. If you do need `this.apiKey` for logging or diagnostics, make it `private readonly` and be aware it will appear in heap snapshots.
