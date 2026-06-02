# server — Narrative Engine API (NestJS)

The backend for the Progressive Generation Engine: the narrative pipeline, hybrid vector + graph store, deterministic state engine, document upload, auth, and admin. See the [root README](../README.md) for the full system and [docs/architecture.md](../docs/architecture.md) for the design.

## Endpoints (prefix `/api`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | — | Returns `{ accessToken }` |
| `POST` | `/generate` | USER | Validate an action; returns narrative + choices + `sessionId` |
| `GET` | `/generate/stream` | USER | SSE beat stream (`chunk` / `done` / `error`) |
| `POST` | `/upload` | USER | Upload `.txt`/`.pdf` lore → graph deltas |
| `GET` | `/session/:id/export` | USER | Full session + history export |
| `GET` `PUT` | `/config/update-spec` | ADMIN | Read / replace the engine update spec |
| `GET` | `/admin/stats` | ADMIN | Entity / edge / session / history counts |

## Setup

Requires PostgreSQL with `pgvector` and an OpenRouter key. Set `.env` at the repo root:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
DATABASE_URL=postgresql://user:pass@localhost:5432/rolai
```

```bash
npm install
npx prisma migrate deploy   # or: npx prisma db push
npx prisma db seed          # seed the initial world
```

Enable pgvector first:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ON "Entity" USING hnsw (embedding vector_cosine_ops);
```

## Running

```bash
PORT=3001 npm run start:dev   # watch mode (3001 avoids the Next.js 3000 clash)
npm run start:prod            # production (after `npm run build`)
```

Embeddings are served locally by `helper-apis` (port 4000) — start it too.

## Testing

```bash
npm test          # unit (Jest) — 182 tests / 23 suites
npm run test:e2e  # end-to-end
npm run test:cov  # coverage
```

## Layout

```
src/
├── main.ts          # bootstrap — /api prefix, PORT
├── app.module.ts    # root module — config, throttler, feature modules
├── auth/            # JWT login, roles guard, jwt strategy
├── generate/        # pipeline: validate → context → stream → extract → engine → choices
├── agents/          # Mastra agents (validator, choice generator)
├── upload/          # lore upload → extractor → graph deltas
├── history/         # session + generation history
├── admin/           # stats endpoint
├── config/          # update-spec, meta-directives, style-guide
└── prisma/          # PrismaService
prisma/schema.prisma # Session, Entity, Edge, GenerationHistory, User
```

## Rate limiting

Global throttle via `@nestjs/throttler`, configurable with `THROTTLE_LIMIT`. All requests proxied through Next.js share one IP bucket, so tests raise the limit.
