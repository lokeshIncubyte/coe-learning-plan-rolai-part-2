---
id: cycle-005
slug: narrative-generator-stream
status: pending
source: "Modify NarrativeGeneratorService to expose a stream(prompt) method using stream: true"
covers: happy-path
group: day3-streaming-endpoint
---

## Behavior
`NarrativeGeneratorService.stream(prompt)` is an async generator that calls `this.client.chat.completions.create({ stream: true })` and yields each `choices[0].delta.content ?? ''` token in order. Calling code can iterate it with `for await`.

## RED
- **Test file**: `src/generate/narrative-generator.service.spec.ts`
- **Assertion**:
  ```ts
  describe('stream', () => {
    let module: TestingModule;

    afterEach(async () => {
      await module.close();
    });

    it('yields content tokens from OpenAI async iterable', async () => {
      module = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          { provide: ConfigService, useValue: makeConfigMock(() => 'test-key') },
        ],
      }).compile();

      const service = module.get(NarrativeGeneratorService);
      async function* mockStream() {
        yield { choices: [{ delta: { content: 'Hello' }, finish_reason: null }] };
        yield { choices: [{ delta: { content: ' world' }, finish_reason: 'stop' }] };
      }
      jest
        .spyOn((service as any).client.chat.completions, 'create')
        .mockResolvedValueOnce(mockStream() as any);

      const tokens: string[] = [];
      for await (const token of service.stream('test prompt')) {
        tokens.push(token);
      }
      expect(tokens).toEqual(['Hello', ' world']);
    });
  });
  ```
- **Why it fails**: `NarrativeGeneratorService` has no `stream` method — `service.stream` is `undefined`.

## GREEN
- **Smallest change**: Add `async *stream(prompt: string)` to `NarrativeGeneratorService`. Await `this.client.chat.completions.create({ model, temperature, max_tokens, stream: true, messages: [system, { role: 'user', content: prompt }] })` and `for await` the result, yielding `chunk.choices[0]?.delta?.content ?? ''` each iteration.
- **Files touched**: `src/generate/narrative-generator.service.ts`

## REFACTOR
none

---
id: cycle-006
slug: generate-stream-sse-endpoint
status: pending
source: "Add a GET /api/generate/stream SSE endpoint to GenerateController"
covers: happy-path
group: day3-streaming-endpoint
---

## Behavior
`GenerateController` exposes `GET /generate/stream` via `@Sse('stream')` accepting a `prompt` query parameter. It returns an `Observable<MessageEvent>` that emits `{ type: 'chunk', content }` for each token from `narrativeService.stream()`, then `{ type: 'done' }`, then `{ type: 'choices', choices: [...] }` — in that order.

## RED
- **Test file**: `src/generate/generate.controller.spec.ts`
- **Placement**: Nest this block **inside** the outer `describe('GenerateController', () => { ... })`, after the existing `it(...)` test. The inner `controller` and `narrativeService` variables shadow the outer `controller` and `service` — that is intentional.
- **Assertion**:
  ```ts
  describe('stream SSE endpoint', () => {
    let controller: GenerateController;
    let narrativeService: { generate: jest.Mock; stream: jest.Mock };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          {
            provide: NarrativeGeneratorService,
            useValue: { generate: jest.fn(), stream: jest.fn() },
          },
        ],
      }).compile();

      controller = module.get(GenerateController);
      narrativeService = module.get(NarrativeGeneratorService) as any;
    });

    it('emits chunk, done, and choices MessageEvents in order', async () => {
      async function* fakeTokens() {
        yield 'Hello';
        yield ' world';
      }
      narrativeService.stream.mockImplementation(() => fakeTokens());

      const observable = controller.stream({ prompt: 'test' });
      const events: any[] = [];
      await new Promise<void>((resolve, reject) => {
        observable.subscribe({
          next: (e) => events.push(e.data),
          error: reject,
          complete: resolve,
        });
      });

      expect(events).toEqual([
        { type: 'chunk', content: 'Hello' },
        { type: 'chunk', content: ' world' },
        { type: 'done' },
        { type: 'choices', choices: expect.any(Array) },
      ]);
    });
  });
  ```
- **Why it fails**: `GenerateController` has no `stream` method — `controller.stream` is `undefined`.

## GREEN
- **Smallest change**: Add the following to `GenerateController`:
  1. Add `Sse, Query` to the existing `@nestjs/common` import; add `import type { MessageEvent } from '@nestjs/common'` as a separate type-only import (required because `isolatedModules: true` is set and `MessageEvent` is an interface, not a value); import `Observable, concat, from, of` from `rxjs`; import `map` from `rxjs/operators`.
  2. Add `@Sse('stream') stream(@Query() query: { prompt: string }): Observable<MessageEvent>` handler.
  3. Inside: `concat(from(this.narrativeService.stream(query.prompt)).pipe(map((token) => ({ data: { type: 'chunk', content: token } }))), of({ data: { type: 'done' } }), of({ data: { type: 'choices', choices: ['Investigate', 'Flee', 'Negotiate'] } }))`.
- **Files touched**: `src/generate/generate.controller.ts`

## REFACTOR
none
