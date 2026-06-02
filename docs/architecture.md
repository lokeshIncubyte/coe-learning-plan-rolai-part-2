# Architecture

The engine generates narrative with an LLM but keeps **world state deterministic**. Two ideas make this work: a two-layer entity model and two-phase retrieval. Everything else hangs off them.

## Services

| Service | Stack | Port | Role |
|---------|-------|------|------|
| `client/` | Next.js (App Router) | 3000 | UI + BFF proxy routes (attach bearer token, forward to API) |
| `server/` | NestJS, Prisma, Mastra | 3001 | Pipeline, graph store, engine, auth, admin |
| `helper-apis/` | Express, `@xenova/transformers` | 4000 | OpenAI-compatible local proxy: embeddings + chat |

The narrative/validation LLM calls go to **OpenRouter**. Embeddings are computed **locally** by `helper-apis` (ONNX `all-MiniLM-L6-v2`, 384-dim) — no per-embedding API spend.

## Two-layer entity model

Each `Entity` splits into two layers that change at very different rates:

- **Identity layer (cold)** — `type`, `archetype`, `role`, `backstory`, and the `embedding vector(384)`. Embedded *once*. Re-embedded **only** on a semantic identity shift (archetype/role/type change or destruction), tracked by `identity_version`.
- **State layer (hot)** — `state` JSON, `last_beat`, and edge weights. Mutated freely on every beat and **never** embedded.

This is why embedding cost does not grow with session length: the things that change every turn live in the layer that is never embedded.

## Two-phase retrieval

For each action the engine assembles context in two phases:

1. **Phase 1 — semantic recall.** pgvector (HNSW, cosine) finds entities whose *identity* is semantically near the action.
2. **Phase 2 — state enrichment.** SQL loads the hot state for the recalled entities and traverses graph `Edge`s (BFS, combined proximity + semantic scoring) to pull in related entities and active rules.

The result is a focused world context: the right characters, their current state, and the rules that apply right now.

## Per-beat pipeline

```
action
  → validate              (accept / reject / modify against world rules)
  → build context         (Phase 1 recall + Phase 2 enrich + rule evaluation)
  → generate (stream)     (LLM prose over SSE, token by token)
  → extract deltas        (LLM parses the beat into typed deltas)
  → engine write-back     (clamp, derive, cascade — deterministic)
  → choices               (2–4 generated next actions)
```

### Deterministic engine

The LLM proposes changes via **function calling**; the engine applies them deterministically:

- **Bounds clamping** — e.g. `hp` stays within 0–100.
- **Derived values** — recomputed from primary state.
- **Recursive cascades** — e.g. low hp triggers a stamina penalty, depth-limited.
- **Rule conflict resolution** — competing rules resolve by priority/specificity.

The model never writes raw numbers into the world; it only suggests deltas the engine validates.

## World bootstrap (document upload)

`POST /api/upload` accepts a `.txt`/`.pdf` lore file. An LLM **extractor** parses it into typed deltas — `new_entity`, `identity_shift`, `state_mutation`, `new_edge` — which are written to the graph with citation tracking. Players start in a seeded world built from real documents rather than hand-written seed scripts.

## Auth & roles

JWT login (`POST /api/auth/login`) issues a token carrying a `Role` (`USER` | `ADMIN`). A roles guard protects admin routes (`/api/admin/stats`, `/api/config/update-spec`). The Next.js layer guards pages client-side; real enforcement is backend JWT verification.

## Data model

See [`server/prisma/schema.prisma`](../server/prisma/schema.prisma): `Session`, `Entity` (identity + state layers), `Edge`, `GenerationHistory`, `User`. pgvector must be enabled and the HNSW index created (note at the top of the schema).
