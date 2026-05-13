import OpenAI from 'openai'
import { describe, it, expect } from 'vitest'
import { classifyApiError } from './error-handling'

describe('classifyApiError', () => {
  it('returns "Invalid API key" for 401', () => {
    const err = new OpenAI.AuthenticationError(401, undefined, 'Unauthorized', null as any)
    expect(classifyApiError(err)).toContain('Invalid API key')
  })
})
