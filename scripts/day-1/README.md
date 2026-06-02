# scripts/day-1 — Narrative CLI (Learning Prototype)

Standalone Node.js CLI that generates a three-beat light fantasy story using the OpenRouter API. Built as a Day-1 learning module focused on API error handling and retry resilience.

## What it does

Calls `openai/gpt-4o-mini` via OpenRouter three times — once per story beat (call to adventure, journey, triumph) — and prints each beat to stdout along with token usage and estimated cost.

## Files

| File | Purpose |
|------|---------|
| `generate.ts` | Entry point — orchestrates the three-beat story loop |
| `error-handling.ts` | `classifyApiError()` and `withRetry()` utilities |
| `error-handling.spec.ts` | Vitest tests for error handling |
| `meta-directives.ts` | Story universe config (theme, genre, world rules) |
| `style-guide.ts` | Narrative tone config (voice, format, content to avoid) |
| `cycles/scr-001-error-handling.md` | TDD spec that drove this module |

## Setup

```bash
# From the repo root, ensure .env exists with your key:
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env

cd scripts/day-1
npm install
```

## Usage

```bash
# Generate a story
npm run generate

# Run tests
npm test
```

## Key patterns

- `withRetry` retries only on `RateLimitError` (429); all other errors propagate immediately.
- `classifyApiError` maps OpenAI SDK error types to human-readable strings for clean exit messages.
- The CLI loads `.env` from the repo root via a relative path (`../../.env`).
