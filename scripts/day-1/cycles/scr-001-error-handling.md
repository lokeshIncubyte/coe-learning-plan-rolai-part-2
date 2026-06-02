---
id: scr-001-004
slug: error-handling
status: done
source: "Day-1 checklist item 5 — 5a: API error classification, 5b: rate limit retry with backoff"
covers: error-path
group: error-handling
---

---

## scr-001 — classify-api-error-401

### Behavior
A new `classifyApiError` function in `error-handling.ts` receives an `OpenAI.AuthenticationError` (status 401) and returns a human-readable string containing "Invalid API key".

### RED
- **Test file**: `scripts/day-1/error-handling.spec.ts`
- **Assertion**:
  ```ts
  import OpenAI from 'openai'
  import { describe, it, expect } from 'vitest'
  import { classifyApiError } from './error-handling'

  describe('classifyApiError', () => {
    it('returns "Invalid API key" for 401', () => {
      const err = new OpenAI.AuthenticationError(401, undefined, 'Unauthorized', null as any)
      expect(classifyApiError(err)).toContain('Invalid API key')
    })
  })
  ```
- **Why it fails**: `error-handling.ts` does not exist; `classifyApiError` is not defined.

### GREEN
- **Smallest change**: Create `scripts/day-1/error-handling.ts` and export `classifyApiError(err: unknown): string` that checks `err instanceof OpenAI.AuthenticationError` and returns `"Invalid API key: ${err.message}"`, with a fallback `return \`Unknown error: ${String(err)}\`` for all other cases.
- **Files touched**: `scripts/day-1/error-handling.ts` (new)

### REFACTOR
none

---

## scr-002 — classify-api-error-429-400

### Behavior
`classifyApiError` distinguishes a 429 (rate limit) from a 400 (bad request), returning distinct messages for each so callers can decide whether to retry.

> **Note**: This cycle intentionally tests two branches together because both live in one new `if/else if` block and neither is meaningful in isolation — splitting would produce a trivially-green second cycle.

### RED
- **Test file**: `scripts/day-1/error-handling.spec.ts`
- **Assertion**:
  ```ts
  it('returns "Rate limited" for 429', () => {
    const err = new OpenAI.RateLimitError(429, undefined, 'Too Many Requests', null as any)
    expect(classifyApiError(err)).toContain('Rate limited')
  })

  it('returns "Bad request" for 400', () => {
    const err = new OpenAI.BadRequestError(400, undefined, 'Bad Request', null as any)
    expect(classifyApiError(err)).toContain('Bad request')
  })
  ```
- **Why it fails**: `classifyApiError` only handles 401; 429 and 400 fall through to the `Unknown error` fallback.

### GREEN
- **Smallest change**: Add `instanceof OpenAI.RateLimitError` → `"Rate limited: ${err.message}"` and `instanceof OpenAI.BadRequestError` → `"Bad request: ${err.message}"` branches before the fallback.
- **Files touched**: `scripts/day-1/error-handling.ts`

### REFACTOR
none

---

## scr-003 — classify-network-error

### Behavior
`classifyApiError` handles the two real network failure shapes:
1. `OpenAI.APIConnectionError` — what the SDK **actually throws** for network failures (DNS failure, connection refused, timeout). It IS an `APIError` subclass but has `status === undefined`, so it requires an explicit branch inside the `instanceof OpenAI.APIError` check.
2. Plain `Error`/`TypeError` — a defensive fallback for unexpected non-SDK throws (almost never happens in practice but guards the `else` branch).

> **Why `TypeError` alone is wrong**: The SDK wraps all fetch-level errors into `APIConnectionError` before they escape. If you test only `new TypeError('fetch failed')`, you are testing the defensive fallback path, not the path that actually fires on a network failure in production. The test that proves real network resilience must use `OpenAI.APIConnectionError`.

### RED
- **Test file**: `scripts/day-1/error-handling.spec.ts`
- **Assertion**:
  ```ts
  it('returns "Network error" for APIConnectionError (real SDK network failure)', () => {
    // APIConnectionError is what the SDK throws for DNS failure, ECONNREFUSED, timeout, etc.
    // Constructor takes { message, cause? } — no status or headers args.
    const err = new OpenAI.APIConnectionError({ message: 'fetch failed' })
    expect(classifyApiError(err)).toContain('Network error')
  })

  it('returns "Network error" for non-APIError (defensive fallback)', () => {
    const err = new TypeError('something unexpected')
    expect(classifyApiError(err)).toContain('Network error')
  })
  ```
- **Why it fails**: `APIConnectionError` enters the `instanceof OpenAI.APIError` branch but has no matching status, so it falls through to the `Unknown error` fallback. The `TypeError` test fails because the `else` branch also says `Unknown error`.

### GREEN
- **Smallest change**:
  1. Add `instanceof OpenAI.APIConnectionError` branch (before other APIError checks) → `"Network error: ${err.message}"`
  2. Change the final `else` fallback to: `return \`Network error: ${err instanceof Error ? err.message : String(err)}\``
- **Files touched**: `scripts/day-1/error-handling.ts`

### REFACTOR
Extract status-to-message mapping to a small lookup if branches grow beyond 4.

---

## scr-004 — withRetry (retry on 429 + exhaustion guard)

### Behavior
A new `withRetry` function in `error-handling.ts` accepts an async supplier and `{ maxRetries, baseDelayMs }`. It retries the supplier on `RateLimitError` up to `maxRetries` times, waiting `baseDelayMs` between attempts. Once all retries are spent it re-throws the last error so the caller is not silently stuck.

> **Why merged**: The retry-success path and the exhaustion path are two sides of the same loop invariant. Implementing the loop without the exhaustion guard leaves an infinite-retry bug; implementing exhaustion without verifying the retry succeeds leaves dead code. A GREEN that handles one without the other is incomplete — both assertions must be red before any code is written.

### RED
- **Test file**: `scripts/day-1/error-handling.spec.ts`
- **Assertion**:
  ```ts
  import { vi, describe, it, expect } from 'vitest'
  import { withRetry } from './error-handling'

  describe('withRetry', () => {
    it('retries up to maxRetries times and resolves on eventual success', async () => {
      const rateLimitErr = new OpenAI.RateLimitError(429, undefined, 'Too Many Requests', null as any)
      const supplier = vi.fn()
        .mockRejectedValueOnce(rateLimitErr)
        .mockResolvedValueOnce('ok')

      const result = await withRetry(supplier, { maxRetries: 1, baseDelayMs: 0 })

      expect(supplier).toHaveBeenCalledTimes(2)
      expect(result).toBe('ok')
    })

    it('re-throws after maxRetries exhausted', async () => {
      const rateLimitErr = new OpenAI.RateLimitError(429, undefined, 'Too Many Requests', null as any)
      // mockRejectedValue (no Once) — every call throws
      const supplier = vi.fn().mockRejectedValue(rateLimitErr)

      await expect(
        withRetry(supplier, { maxRetries: 2, baseDelayMs: 0 })
      ).rejects.toThrow('Too Many Requests')

      // 1 initial attempt + 2 retries = 3 total calls
      expect(supplier).toHaveBeenCalledTimes(3)
    })
  })
  ```
- **Why it fails**: `withRetry` does not exist.

### GREEN
- **Smallest change**: Export `withRetry<T>(supplier: () => Promise<T>, opts: { maxRetries: number, baseDelayMs: number }): Promise<T>`:
  ```ts
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await supplier()
    } catch (err) {
      const isLast = attempt === opts.maxRetries
      if (isLast || !(err instanceof OpenAI.RateLimitError)) throw err
      await new Promise(r => setTimeout(r, opts.baseDelayMs))
    }
  }
  ```
  `baseDelayMs: 0` in tests means `setTimeout(r, 0)` — no real timer delay, no fake-timer setup needed.
- **Files touched**: `scripts/day-1/error-handling.ts`

### REFACTOR
- Wire `generate.ts`: replace the bottom `.catch` block with `classifyApiError`, and wrap the `client.chat.completions.create(...)` call inside `withRetry`.
- Consider exposing the attempt count in the re-thrown error message for easier debugging.
