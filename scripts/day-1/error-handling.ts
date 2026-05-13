import OpenAI from 'openai'

export function classifyApiError(err: unknown): string {
  if (err instanceof OpenAI.AuthenticationError) return `Invalid API key: ${err.message}`
  if (err instanceof OpenAI.RateLimitError)      return `Rate limited: ${err.message}`
  if (err instanceof OpenAI.BadRequestError)     return `Bad request: ${err.message}`
  return `Unknown error: ${String(err)}`
}
