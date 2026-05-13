import OpenAI from 'openai'

export async function withRetry<T>(
  supplier: () => Promise<T>,
  opts: { maxRetries: number; baseDelayMs: number }
): Promise<T> {
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await supplier()
    } catch (err) {
      const isLast = attempt === opts.maxRetries
      if (isLast || !(err instanceof OpenAI.RateLimitError)) throw err
      await new Promise(r => setTimeout(r, opts.baseDelayMs))
    }
  }
  throw new Error('unreachable')
}

export function classifyApiError(err: unknown): string {
  if (err instanceof OpenAI.APIConnectionError)  return `Network error: ${err.message}`
  if (err instanceof OpenAI.AuthenticationError) return `Invalid API key: ${err.message}`
  if (err instanceof OpenAI.RateLimitError)      return `Rate limited: ${err.message}`
  if (err instanceof OpenAI.BadRequestError)     return `Bad request: ${err.message}`
  return `Network error: ${err instanceof Error ? err.message : String(err)}`
}
