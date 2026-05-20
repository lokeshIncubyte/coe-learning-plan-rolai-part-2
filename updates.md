# Day Updates

**Day 3 — Streaming**
NestJS `@Sse()` endpoint streams OpenAI tokens chunk-by-chunk with typed events (`start`, `chunk`, `choices`, `done`, `error`).

**Day 4 — Mastra Agents**
Two Mastra agents added — `ActionValidator` (accepted/modified/rejected) and `ChoiceGenerator` (tagged choices) — integrated into both POST and SSE paths using live graph entity context.

**Day 5 — Entity Graph (PostgreSQL)**
Prisma schema with `Entity`, `Edge`, `GenerationHistory`, `Session` models; `GraphService` with full CRUD and transactional state updates; seeded with 10 entities and 7 edges.

**Day 6 — Next.js UI**
Next.js App Router client with SSE streaming, choice buttons, free-text action input, inline validation feedback, optimistic UI rollback, narrative history, and passing Playwright E2E tests.
