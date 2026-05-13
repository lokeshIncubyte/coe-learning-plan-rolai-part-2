import OpenAI from 'openai'

export function classifyApiError(err: unknown): string {
  if (err instanceof OpenAI.AuthenticationError) return `Invalid API key: ${err.message}`
  return `Unknown error: ${String(err)}`
}
