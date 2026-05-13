import OpenAI from 'openai'
import { describe, it, expect, vi } from 'vitest'
import { classifyApiError, withRetry } from './error-handling'

describe('classifyApiError', () => {
  it('returns "Invalid API key" for 401', () => {
    const err = new OpenAI.AuthenticationError(401, undefined, 'Unauthorized', null as any)
    expect(classifyApiError(err)).toContain('Invalid API key')
  })

  it('returns "Rate limited" for 429', () => {
    const err = new OpenAI.RateLimitError(429, undefined, 'Too Many Requests', null as any)
    expect(classifyApiError(err)).toContain('Rate limited')
  })

  it('returns "Bad request" for 400', () => {
    const err = new OpenAI.BadRequestError(400, undefined, 'Bad Request', null as any)
    expect(classifyApiError(err)).toContain('Bad request')
  })

  it('returns "Network error" for APIConnectionError (real SDK network failure)', () => {
    const err = new OpenAI.APIConnectionError({ message: 'fetch failed' })
    expect(classifyApiError(err)).toContain('Network error')
  })

  it('returns "Network error" for non-APIError (defensive fallback)', () => {
    const err = new TypeError('something unexpected')
    expect(classifyApiError(err)).toContain('Network error')
  })
})

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
    const supplier = vi.fn().mockRejectedValue(rateLimitErr)

    await expect(
      withRetry(supplier, { maxRetries: 2, baseDelayMs: 0 })
    ).rejects.toThrow('Too Many Requests')

    expect(supplier).toHaveBeenCalledTimes(3)
  })
})
