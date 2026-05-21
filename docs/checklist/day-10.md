# Day 10 Checklist — Production Features + Full Pipeline + Deployment

**Project focus:** Complete integration of the two-layer architecture end-to-end, session isolation, history logging fix, config/admin UI, and deployment readiness

---

## 1. Core Learning

- [ ] Understand full pipeline flow: action → validator → engine → graph mutation → Phase 1 semantic recall → Phase 2 state enrichment → rules → prompt → generator → extractor → write-back → choices
- [ ] Understand session-scoped world isolation — per-user hot layer (graph state) vs shared cold layer (identity embeddings)
- [ ] Understand caching strategy — Phase 2 joins and traversal results are the right cache targets; embeddings are stable by design
- [ ] Understand telemetry for AI pipelines — Phase 1 latency, Phase 2 latency, identity-shift frequency, embedding spend

---

## 2. GenerationHistory Logging Fix

- [ ] Investigate why `GenerationHistory` stopped receiving entries after 271 rows (last entry: 2026-05-16)
- [ ] Identify the broken write path and fix it
- [ ] Verify all generate calls log to `GenerationHistory` with session anchor, narrative, and deltas

---

## 3. Full Pipeline — End-to-End Wiring

- [ ] `GenerateController.generate()` orchestrates the full sequence:
  1. Validate action (Mastra ActionValidator)
  2. Apply incoming deltas via `EngineService.processDeltas` (engine → graph mutation)
  3. Phase 1: `GraphService.semanticRecall(prompt)` — vector search returns candidate entity IDs
  4. Phase 2: state enrichment — join graph-layer state onto recalled entities
  5. Rule evaluation — `RuleEvaluator` filters active rules using enriched state
  6. Prompt assembly — inject entities (with live state) + active rules into system prompt
  7. LLM generation (streaming narrative)
  8. Extractor: parse LLM output into `Delta[]` (new entities, state mutations, identity shifts)
  9. Write-back: apply extracted deltas via `EngineService.processDeltas`
  10. Choice generation (Mastra ChoiceGenerator)
- [ ] Each stage failure is isolated — one stage failing does not corrupt earlier writes
- [ ] Integration test covers the full sequence with real DB

---

## 4. Session Model + World Isolation

- [ ] Session model exists in Prisma schema (already has `Session` table — verify it links to Entity)
- [ ] Each generate call is scoped to a session
- [ ] Session-scoped entity queries — state reads/writes filter by session
- [ ] New sessions start with a clean graph state (shared identity/embedding layer is read-only at session start)
- [ ] `POST /api/session` — creates a new session, returns session ID
- [ ] Session ID threaded through `GenerateController` → `GraphService` → `GenerationHistory`

---

## 5. Session Save / Export

- [ ] `GET /api/session/:id/export` — exports full session graph (entities + edges + state + history) as JSON
- [ ] Export includes generation history for the session
- [ ] Session can be re-loaded from export (graph state restored, embeddings not re-generated)

---

## 6. Error Handling + Fallbacks

- [ ] LLM timeout / error → return last known choices, log error, do not write partial state
- [ ] Extractor parse failure → log malformed response, skip write-back, stream continues
- [ ] Engine clamp failure → propagate error with entity ID and field name
- [ ] Phase 1 recall failure (pgvector unavailable) → fall back to recent-entity heuristic
- [ ] All unhandled errors return structured `{ error, stage, retryable }` response

---

## 7. Config Editor UI (Next.js)

- [ ] Route `/config` — editable view of `update-spec.json` (variables, bounds, derived formulas, cascade rules)
- [ ] Changes saved via `PUT /api/config/update-spec`
- [ ] Live validation — shows schema errors before saving

---

## 8. Admin Dashboard UI (Next.js)

- [ ] Route `/admin` — shows:
  - Total entities, edges, sessions
  - `GenerationHistory` count and most recent entry
  - Identity-shift events vs state-mutation events (from history deltas)
  - Embedding count vs re-embed events (proxy for cost)
- [ ] Data fetched from `GET /api/admin/stats`

---

## 9. Deployment Readiness

- [ ] All environment variables documented in `.env.example`
- [ ] `docker-compose.yml` at project root starts Postgres (pgvector) + helper-apis + NestJS + Next.js
- [ ] `README.md` updated with setup instructions and architecture diagram
- [ ] Architecture diagram created: two-layer split + two-phase retrieval flow

---

## 10. Success Criteria

- [ ] Full pipeline integrated end-to-end — action flows through all 10 stages
- [ ] `GenerationHistory` logging working — every generate call creates a row
- [ ] Session isolation working — two sessions do not share state
- [ ] Session export/import works on the graph layer without re-embedding
- [ ] All pipeline stage errors handled gracefully with structured responses
- [ ] Config editor allows live edits to update-spec without server restart
- [ ] Admin dashboard shows real-time entity, history, and embedding stats
- [ ] `docker compose up` starts the full stack from scratch
- [ ] Embedding spend stays flat as session length grows (graph mutations don't re-embed)
