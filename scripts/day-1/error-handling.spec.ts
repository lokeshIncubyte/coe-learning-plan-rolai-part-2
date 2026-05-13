import OpenAI from 'openai'
import { describe, it, expect } from 'vitest'
import { classifyApiError } from './error-handling'

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
})
