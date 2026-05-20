# Day 7 Checklist — Hybrid Vector + Graph Architecture + Traversal Engine + Rule Evaluator

**Project focus:** Progressive Gen (hybrid vector + graph entity store with two-phase retrieval) + AI Chat Assistant (RAG knowledge base)

---

## 1. Core Learning

- [ ] Understand RAG (Retrieval Augmented Generation) — why static prompts don't scale with a growing world
- [ ] Understand why mutable entities break naive RAG — re-embedding on every state change is cost-prohibitive
- [ ] Understand the hybrid pattern — split identity (cold, embedded, stable) from state (hot, mutable, never embedded)
- [ ] Understand pgvector — cosine similarity, `<=>` operator, HNSW index
- [ ] Understand two-phase retrieval — Phase 1 (semantic recall, vector layer) → Phase 2 (state enrichment, graph layer)

---

## 2. Prisma Schema — Entity Identity Layer

> **TDD:** Cycle 028 writes `server/prisma/schema.prisma` only — no spec file. Prerequisite for all EmbeddingService type checks.

- [ ] Add identity fields to `Entity`: `archetype String?`, `backstory String?`, `role String?`, `identity_version Int @default(0)`
- [ ] Add `embedding Unsupported("vector(384)")?` to `Entity` (pgvector column, 384-dim ONNX all-MiniLM-L6-v2)
- [ ] Add `last_beat String?` to `Entity` (mutable, state layer — never embedded)

---

## 3. EmbeddingService

> **TDD:** Use `/plan-cycle` before implementing (cycles 029–033). Each method is independently unit-testable with a mocked PrismaService and OpenAI client.

- [ ] `buildIdentityText(entity)` — joins name/type/archetype/backstory/role with ` | `, omits nulls; never includes state/facts
- [ ] `shouldReembed(before, after)` — returns `false` on state-only change; `true` when any identity field (name/type/archetype/backstory/role) differs
- [ ] `generateEmbedding(text)` — calls local ONNX proxy via OpenAI SDK (`helper-apis`); zero-vector fallback when proxy unreachable
- [ ] `embedEntityIdentity(entityId)` — reads entity, builds identity text, writes 384-dim vector via `$executeRawUnsafe` (not `$executeRaw` — pgvector misparses parameterised vectors)
- [ ] `onEntityWrite(before, after)` — fires `embedEntityIdentity` + increments `identity_version` only when `shouldReembed` returns true

---

## 4. GraphService — Two-Phase Retrieval

> **TDD:** Use `/plan-cycle` (cycles 034–039). Phase 1 and Phase 2 are independently testable. The re-embed hook (cycle 039) requires adding EmbeddingService to GraphService's constructor.

- [ ] `getAllEntitiesWithEdges()` — returns all non-rule entities with `fromEdges` + `toEdges` included (fallback path)
- [ ] `findSimilarEntityIds(embedding, limit, threshold)` — Phase 1: `$queryRawUnsafe` cosine search, returns `{id, similarity}[]` above threshold
- [ ] `enrichWithState(ids)` — Phase 2: fetches entities + edges by ID list via `include: { fromEdges, toEdges }`, preserves Phase 1 ordering
- [ ] `semanticRecall(queryText, limit)` — composes Phase 1 → Phase 2; returns `{ entities: EnrichedEntity[], scores: Map<string, number> }`
- [ ] `updateEntityIdentity(id, patch)` — updates identity fields, fires `onEntityWrite` hook (may trigger re-embed)
- [ ] `updateEntityState(id, patch)` — wires `onEntityWrite` after write (state mutations must NOT trigger re-embed)

---

## 5. TraversalService

> **TDD:** Use `/plan-cycle` (cycles 040–042). BFS core is one natural atomic pass (cycle 040); tag filtering and `scoreWithSemantics` are separately addable.

- [ ] `traverse(anchorId, entities, maxDepth, tags?)` — BFS from anchor following `fromEdges` + `toEdges` bidirectionally up to `maxDepth`
- [ ] Cycle prevention via visited set (no entity appears twice)
- [ ] `proximityScore` = 1.0 at anchor; `1 / (1 + hopCount * edgeWeight)` for farther nodes
- [ ] No-anchor fallback — include all entities at hop 0 when `anchorId` is empty or not in the entity list
- [ ] Tag filtering — skip edges with no tag overlap when `tags` filter is provided
- [ ] `scoreWithSemantics(traversed, phase1Scores)` — re-ranks with 50/50 blend of `proximityScore` + Phase 1 similarity score; sorts by `combinedScore` descending

---

## 6. RuleEvaluatorService

> **TDD:** Use `/plan-cycle` (cycles 043–047). Each trigger type is a distinct case; priority sorting and conflict detection are independently testable.

- [ ] `entity-presence` trigger — satisfied when the entity ID appears in the reached set
- [ ] `state-value` trigger — satisfied when `entity.state[field] === value`
- [ ] `relationship` trigger — satisfied when a directed edge `fromId → toId` with matching `type` exists in any entity's `fromEdges`
- [ ] AND logic — all triggers in a rule must be satisfied for it to fire
- [ ] Sort fired rules by `priority` descending, then by `specificity` (trigger count) descending when priority is equal
- [ ] Conflict detection — flag rules with antonym-pair outcomes (`allow`/`deny`, `open`/`close`, `enable`/`disable`, `grant`/`revoke`, `accept`/`reject`) via `conflictsWith` array

---

## 7. Prompt Integration

> **TDD:** Use `/plan-cycle` (cycles 048–050). The worldContext injection (048) and the controller retrieval pipeline (049–050) are independently testable.

- [ ] `NarrativeGeneratorService.generate(prompt, worldContext?)` — injects `WORLD CONTEXT` block into system prompt when `worldContext` is non-empty
- [ ] `NarrativeGeneratorService.stream(prompt, signal?, worldContext?)` — same injection for the streaming path
- [ ] `GenerateController.buildContexts(prompt)` — replaces the 3× `getEntitiesByType` calls with `semanticRecall → traverse → scoreWithSemantics` pipeline; injects `TraversalService` and `RuleEvaluatorService`
- [ ] `buildContexts` runs `RuleEvaluatorService.evaluateRules(allEntities, rules)` and formats `RULES:` block from `activeRules` outcomes (including `conflictsWith` annotations)
- [ ] Fallback — when `semanticRecall` returns no candidates (zero-vector or empty index), call `getAllEntitiesWithEdges` to ensure generation stays grounded

---

## 8. Success Criteria

- [ ] pgvector extension set up and `embedding vector(384)` column added to Entity
- [ ] Entity model split: identity layer (archetype, backstory, role, identity_version, embedding) + state layer (state, last_beat)
- [ ] Embeddings generated from identity fields only (name | type | archetype | backstory | role)
- [ ] Re-embedding fires only on semantic identity shift — never on state mutation
- [ ] Phase 1 semantic recall (pgvector cosine search) implemented and tested
- [ ] Phase 2 state enrichment (SQL join with edges) preserves Phase 1 ordering
- [ ] TraversalService BFS traversal with depth limit, cycle prevention, and proximity scoring
- [ ] Tag-filtering on edges works correctly
- [ ] Graph proximity + Phase 1 semantic score blended at 50/50 in `scoreWithSemantics`
- [ ] RuleEvaluator handles entity-presence, state-value, and relationship triggers
- [ ] Rules sorted by priority then specificity; contradictions surfaced in `conflictsWith`
- [ ] Active rules and traversed entity context injected into generation prompt
- [ ] Generation uses two-phase retrieved context end-to-end
- [ ] Fallback path works when Phase 1 returns no candidates
- [ ] All 23 TDD cycles (028–050) green
