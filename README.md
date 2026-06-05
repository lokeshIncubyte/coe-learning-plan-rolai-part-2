# Progressive Generation Engine

An interactive narrative engine that generates a light-fantasy story beat-by-beat, where every player action mutates a persistent world. It pairs an LLM for prose with a **deterministic state engine** for the numbers, and a **hybrid vector + graph memory** so the right characters, relationships, and rules surface for each action — without re-embedding the world on every turn.

Built as Part 2 (Advanced AI Integration) of the Rolai programme — see [`docs/roadmap.md`](./docs/roadmap.md) for the full 10-day build plan. All 10 days are complete.

---

## What it does

- **Streams narrative beats** token-by-token over SSE, with 2–4 generated choices after each beat.
- **Validates custom actions** against world rules before they advance the story (accept / reject / modify).
- **Two-layer entity model** — a *cold* identity layer (embedded once, stable) and a *hot* state layer (mutated freely, never embedded). Embeddings are write-rare by design.
- **Two-phase retrieval** — Phase 1 pgvector semantic recall → Phase 2 SQL state enrichment + graph edge traversal.
- **Deterministic engine** — bounds clamping, derived values, and recursive cascades driven by LLM function-calling, so the model never touches the raw numbers (hp stays 0–100, low hp triggers stamina cascades, conflicting rules resolve by priority).
- **World bootstrap from documents** — upload a `.txt`/`.pdf` lore file and an LLM extractor parses it into typed deltas (new entities, identity shifts, state mutations, new edges) written to the graph.
- **Auth & roles** — JWT login with `USER` / `ADMIN` roles, an admin stats endpoint, session export, and live update-spec config.

---

## Architecture

Three services run side by side:

| Service | Stack | Port | Responsibility |
|---------|-------|------|----------------|
| `client/` | Next.js (App Router), React | `3000` | UI + BFF proxy routes that forward to the API with the bearer token |
| `server/` | NestJS, Prisma, Mastra | `3001` | Narrative pipeline, graph store, engine, auth, admin |
| `helper-apis/` | Express, `@xenova/transformers` | `4000` | OpenAI-compatible local proxy: embeddings (ONNX `all-MiniLM-L6-v2`, 384-dim) and chat completions |

```
Browser
  │
  ▼
Next.js (3000) ──proxy──► NestJS API (3001) ──► PostgreSQL + pgvector
                               │
                               ├──► OpenRouter        (narrative + validation LLM)
                               └──► helper-apis (4000) (local embeddings)
```

### Request pipeline (per beat)

```
action → validate → build context (Phase 1 recall + Phase 2 enrich + rules)
       → generate (stream) → extract deltas → engine write-back → choices
```

### Data model (`server/prisma/schema.prisma`)

- **Entity** — `identity layer` (`archetype`, `role`, `backstory`, `embedding vector(384)`) + `state layer` (`state`, `last_beat`, mutable, never embedded).
- **Edge** — typed, weighted relationships between entities.
- **Session / GenerationHistory** — per-session beat log with anchor + deltas.
- **User** — email, bcrypt hash, `Role` enum (`USER` | `ADMIN`).

> pgvector is required. Enable it in Postgres and add the HNSW index (see the note at the top of `schema.prisma`).

---

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL with the `pgvector` extension
- An OpenRouter API key (narrative + validation LLM)

### 1. Environment

Create `.env` at the repo root:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
DATABASE_URL=postgresql://user:pass@localhost:5432/rolai
```

### 2. Install

```bash
(cd server && npm install)
(cd client && npm install)
(cd helper-apis && npm install)
```

### 3. Database

```bash
cd server
npx prisma migrate deploy      # or: npx prisma db push
npx prisma db seed             # seeds the initial world
```

Make sure pgvector is enabled first:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ON "Entity" USING hnsw (embedding vector_cosine_ops);
```

### 4. Run (three terminals)

```bash
# 1) local embeddings / chat proxy
cd helper-apis && npm run dev          # http://localhost:4000

# 2) API
cd server && PORT=3001 npm run start:dev

# 3) UI
cd client && npm run dev               # http://localhost:3000
```

Open http://localhost:3000 and log in with a seeded user.

---

## API reference (NestJS, prefix `/api`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | — | Returns `{ accessToken }` |
| `POST` | `/api/generate` | USER | Validate an action; returns narrative + choices + `sessionId` |
| `GET` | `/api/generate/stream` | USER | SSE stream of a beat (`chunk` / `done` / `error` events) |
| `POST` | `/api/upload` | USER | Upload `.txt`/`.pdf` lore → graph deltas |
| `GET` | `/api/session/:id/export` | USER | Full session + history export |
| `GET` | `/api/config/update-spec` | ADMIN | Read the engine update spec |
| `PUT` | `/api/config/update-spec` | ADMIN | Replace the update spec |
| `GET` | `/api/admin/stats` | ADMIN | Entity / edge / session / history counts |

Rate limiting is global via `@nestjs/throttler` (configurable with `THROTTLE_LIMIT`; the live-test setup uses a high value because all proxied requests share one IP bucket).

---

## Demo scenarios

The `demos/` directory contains three self-contained scenarios for live presentations.
Each scenario seeds specific entities with known stats, then tests that the narrative
reflects those stats correctly.

### Seed a scenario for the chat

```bash
# List all available scenarios and currently seeded entities
node demos/seed-scenario.mjs list

# Seed a scenario (cleans previous demo entities first)
node demos/seed-scenario.mjs seed 01-injured-healer   # Lady Vethara, hp:20, desperate
node demos/seed-scenario.mjs seed 02-stat-update      # Gareth the Scout, hp:15, shaken
node demos/seed-scenario.mjs seed 03-new-location     # The Amber Forge, abandoned

# Remove all demo entities (leaves seed world intact)
node demos/seed-scenario.mjs clean
```

After seeding, open the chat at http://localhost:3000 and try the suggested prompts:

| Scenario | Suggested prompt |
|----------|-----------------|
| `01-injured-healer` | `Lady Vethara calls out from the healer's tent` |
| `02-stat-update` | `Gareth the Scout limps out from the tree line` |
| `03-new-location` | `I push open the door of the Amber Forge` |

### Run the automated test loop

The test loop injects an entity, generates narratives, checks assertions, then cleans up —
repeating up to 3 times until all assertions pass.

```bash
# Default scenario (injured healer)
node demos/test-loop.mjs

# Specific scenario
node demos/test-loop.mjs demos/01-injured-healer.mjs
node demos/test-loop.mjs demos/02-stat-update.mjs
node demos/test-loop.mjs demos/03-new-location.mjs
```

See [`GENERATION-FLOW.md`](./GENERATION-FLOW.md) for a full ASCII flowchart of how
player input becomes a narrative beat and choices.

---

## Testing

```bash
cd server && npm test            # unit (Jest) — 182 tests / 23 suites
cd server && npm run test:e2e    # NestJS e2e

cd client && npm test            # component tests (Jest + RTL)
cd client && npm run e2e         # Playwright (mocked API)
```

A **live e2e suite** (`client/e2e/live.spec.ts`, run via `playwright.live.config.ts`) drives the real game loop against a running NestJS + helper-apis + OpenRouter stack with no mocking — the highest-fidelity regression check.

---

## Repository layout

```
.
├── client/            # Next.js UI + BFF proxy routes
├── server/            # NestJS API (auth, generate, upload, admin, config, engine, graph)
├── helper-apis/       # Express OpenAI-compatible proxy (local embeddings + chat)
├── scripts/day-1/     # Standalone Day-1 narrative-generator scripts
├── docs/              # Project documentation (see docs/README.md)
│   └── roadmap.md     # The 10-day build plan
└── cycles/            # TDD cycle specs (one file per RED→GREEN→REFACTOR cycle)
```

> TDD cycle specs are colocated with the package they drive: `server/cycles/`, `client/cycles/`, and the root `cycles/` (engine + auth). See [`docs/`](./docs) for checklists, daily notes, user stories, and process post-mortems.

---

## How it was built

Strictly test-driven, one small RED→GREEN→REFACTOR cycle per file in `cycles/`. The project follows the 10-day roadmap; daily checklists live in `docs/checklist/`, learning notes in `docs/notes/`, and a TDD post-mortem (lessons from bugs that passed unit tests but failed at runtime) in [`docs/tdd-post-mortem.md`](./docs/tdd-post-mortem.md).
