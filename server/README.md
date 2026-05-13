# server — Narrative Generation API (NestJS)

REST API that generates light fantasy narrative beats using the OpenRouter API. Built with NestJS; includes rate limiting, request logging, and structured OpenAI error handling.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/generate` | Generate a narrative beat and return player choices |

### POST /api/generate

**Request body**
```json
{ "prompt": "A young fox discovers a glowing door in the forest" }
```

**Response**
```json
{
  "narrative": "...",
  "choices": ["Investigate", "Flee", "Negotiate"]
}
```

## Setup

```bash
# From the repo root, ensure .env exists:
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env
# Optionally set a custom port (defaults to 3000):
echo "PORT=3000" >> .env

cd server
npm install
```

## Running

```bash
npm run start:dev   # watch mode
npm run start       # production
```

## Testing

```bash
npm test            # unit tests (Jest)
npm run test:e2e    # end-to-end tests
npm run test:cov    # coverage report
```

## Architecture

```
src/
├── main.ts                             # Bootstrap — sets /api prefix, listens on PORT
├── app.module.ts                       # Root module — ConfigModule, ThrottlerModule, GenerateModule
└── generate/
    ├── generate.controller.ts          # POST /api/generate handler
    ├── narrative-generator.service.ts  # OpenAI client + prompt construction
    ├── engine.service.ts               # Stub — pipeline orchestration (Day 9)
    ├── graph.service.ts                # Stub — Prisma entity graph (Day 5)
    ├── state.service.ts                # Stub — session state (Day 5)
    ├── logging.interceptor.ts          # Logs method/URL + narrative length/elapsed time
    └── openai-exception.filter.ts      # Maps OpenAI SDK errors → HTTP status codes
```

Config shared between modules lives in `src/config/`:
- `meta-directives.ts` — story universe (theme, genre, world rules)
- `style-guide.ts` — narrative tone (voice, format, content to avoid)

## Rate limiting

Global throttle: **5 requests per 60 seconds** (via `@nestjs/throttler`). Exceeding this returns 429.

## Error mapping

| OpenAI error | HTTP status |
|---|---|
| `RateLimitError` | 429 |
| `AuthenticationError` | 401 |
| `BadRequestError` | 400 |
| `APIConnectionError` | 503 |
| Other | 500 |

## Stub services

`GraphService`, `StateService`, and `EngineService` are intentional stubs scheduled for replacement:
- **Day 5**: Graph and state backed by Prisma
- **Day 9**: Engine replaced with deterministic pipeline orchestration
