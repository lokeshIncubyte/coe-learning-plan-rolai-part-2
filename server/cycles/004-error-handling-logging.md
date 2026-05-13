---
id: cycle-004-006
slug: error-handling-logging
status: done
source: "Day-2 Section 5 — Error Handling & Logging"
covers: error-path
group: day2-error-handling
---

---

## cycle-004 — openai-exception-filter

### Behavior
`OpenAiExceptionFilter` implements `ExceptionFilter` with `@Catch()`. It maps OpenAI SDK errors to HTTP status codes: `RateLimitError` → 429, `AuthenticationError` → 401, `BadRequestError` → 400, `APIConnectionError` → 503. The response body is `{ message: string }`. The filter is applied to `GenerateController` via `@UseFilters(new OpenAiExceptionFilter())`.

### RED
- **Test file**: `server/src/generate/openai-exception.filter.spec.ts`
- **Assertion**:
  ```ts
  import { ArgumentsHost } from '@nestjs/common'
  import { OpenAiExceptionFilter } from './openai-exception.filter'
  import OpenAI from 'openai'

  function makeHost() {
    const mockJson = jest.fn()
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson })
    return {
      host: {
        switchToHttp: () => ({
          getResponse: () => ({ status: mockStatus }),
          getRequest: () => ({}),
        }),
      } as unknown as ArgumentsHost,
      mockStatus,
      mockJson,
    }
  }

  describe('OpenAiExceptionFilter', () => {
    const filter = new OpenAiExceptionFilter()

    it.each<[string, number, unknown]>([
      ['RateLimitError', 429, new OpenAI.RateLimitError(429, undefined, 'Too Many Requests', null as any)],
      ['AuthenticationError', 401, new OpenAI.AuthenticationError(401, undefined, 'Unauthorized', null as any)],
      ['BadRequestError', 400, new OpenAI.BadRequestError(400, undefined, 'Bad Request', null as any)],
      ['APIConnectionError', 503, new OpenAI.APIConnectionError({ message: 'fetch failed' })],
    ])('maps %s to HTTP %i', (_label, expectedStatus, err) => {
      const { host, mockStatus, mockJson } = makeHost()
      filter.catch(err, host)
      expect(mockStatus).toHaveBeenCalledWith(expectedStatus)
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }))
    })
  })
  ```
- **Why it fails**: `openai-exception.filter.ts` does not exist — the import fails immediately.

### GREEN
- **Smallest change**: Create `OpenAiExceptionFilter` with `@Catch(OpenAI.APIError)` — **not** `@Catch()` (no args). Using `@Catch()` would catch all exceptions including `ThrottlerException`, overriding its `429` with a `500` default. `@Catch(OpenAI.APIError)` only intercepts the four SDK error types (all subclasses of `APIError`), leaving `ThrottlerException` to NestJS's built-in handler. Implement `catch(exception: OpenAI.APIError, host: ArgumentsHost)`. Get the Express response via `host.switchToHttp().getResponse<Response>()`. Map exception types to status + message. Call `response.status(status).json({ message })`. Add `@UseFilters(new OpenAiExceptionFilter())` to `GenerateController` (using an instance avoids DI resolution in test modules).
- **Files touched**:
  - `server/src/generate/openai-exception.filter.ts` (new)
  - `server/src/generate/generate.controller.ts` (add `@UseFilters`)

### REFACTOR
none

---

## cycle-005 — logging-interceptor

### Behavior
`LoggingInterceptor` implements `NestInterceptor`. It logs `[Request] METHOD URL` before the handler and `[Response] narrative length: N, elapsed: Xms` after. It is applied to `GenerateController` via `@UseInterceptors(new LoggingInterceptor())`.

### RED
- **Test file**: `server/src/generate/logging.interceptor.spec.ts`
- **Assertion**:
  ```ts
  import { ExecutionContext, CallHandler } from '@nestjs/common'
  import { lastValueFrom, of } from 'rxjs'
  import { LoggingInterceptor } from './logging.interceptor'

  describe('LoggingInterceptor', () => {
    let interceptor: LoggingInterceptor
    let logSpy: jest.SpyInstance

    beforeEach(() => {
      interceptor = new LoggingInterceptor()
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      logSpy.mockRestore()
    })

    it('logs method and url before, then narrative length and latency after', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', url: '/api/generate' }),
        }),
      } as unknown as ExecutionContext

      const mockHandler: CallHandler = {
        handle: () => of({ narrative: 'Hello world' }),
      }

      await lastValueFrom(interceptor.intercept(mockContext, mockHandler))

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('POST'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('/api/generate'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('narrative length: 11')) // 'Hello world'.length === 11
      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\d+ms/))
    })
  })
  ```
- **Why it fails**: `logging.interceptor.ts` does not exist — the import fails immediately.

### GREEN
- **Smallest change**: Create `LoggingInterceptor` with `@Injectable()` implementing `NestInterceptor`. Imports: `import { tap } from 'rxjs/operators'`. In `intercept(context, next)`: extract `method` and `url` from request, record `start = Date.now()`. Call `console.log(\`[Request] ${method} ${url}\`)`. Return `next.handle().pipe(tap(data => console.log(\`[Response] narrative length: ${data?.narrative?.length ?? 0}, elapsed: ${Date.now() - start}ms\`)))`. Add `@UseInterceptors(new LoggingInterceptor())` to `GenerateController`.
- **Files touched**:
  - `server/src/generate/logging.interceptor.ts` (new — imports `tap` from `'rxjs/operators'`)
  - `server/src/generate/generate.controller.ts` (add `@UseInterceptors`)

### REFACTOR
none

---

## cycle-006 — rate-limiting

### Behavior
`ThrottlerModule` is configured globally in `AppModule` with `{ ttl: 60000, limit: 5 }`. `ThrottlerGuard` is registered as a global guard via `APP_GUARD`. A second request to `POST /generate` within the TTL window that exceeds the limit is rejected with 429.

### RED
- **Test file**: `server/src/generate/rate-limiting.spec.ts`
- **Assertion**:
  ```ts
  import request from 'supertest'
  import { Test } from '@nestjs/testing'
  import { INestApplication } from '@nestjs/common'
  import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
  import { APP_GUARD } from '@nestjs/core'
  import { GenerateController } from './generate.controller'
  import { NarrativeGeneratorService } from './narrative-generator.service'

  describe('Rate limiting', () => {
    let app: INestApplication

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1 }])],
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('ok') } },
          { provide: APP_GUARD, useClass: ThrottlerGuard },
        ],
      }).compile()

      app = module.createNestApplication()
      await app.init()
    })

    afterEach(async () => {
      await app.close()
    })

    it('allows first request and rejects second with 429', async () => {
      await request(app.getHttpServer())
        .post('/generate')
        .send({ prompt: 'test' })
        .expect(200)

      await request(app.getHttpServer())
        .post('/generate')
        .send({ prompt: 'test' })
        .expect(429)
    })
  })
  ```
- **Why it fails**: `@nestjs/throttler` is not installed — the import fails immediately.

### GREEN
- **Smallest change**: Install `@nestjs/throttler@^6.4.0` (first version with NestJS 11 peer-dep support). Add `ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }])` to `AppModule.imports`. Add a new `providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]` array to `AppModule` (it does not exist yet). Import `APP_GUARD` from `@nestjs/core` and `ThrottlerGuard` from `@nestjs/throttler`.
> **Test isolation note**: cycle-006's test module only includes `GenerateController` + mock service + throttler, with no explicit providers for `OpenAiExceptionFilter` or `LoggingInterceptor`. This works because those are bound with `new` instances (`@UseFilters(new ...)`, `@UseInterceptors(new ...)`) — NestJS bypasses DI for pre-constructed instances. If those decorators are ever refactored to class tokens, the rate-limiting test will break.
- **Files touched**:
  - `server/src/app.module.ts` (add ThrottlerModule + APP_GUARD)
  - `package.json` / `package-lock.json` (install @nestjs/throttler)

### REFACTOR
none
