# Day 9 Checklist — Function Calling + Deterministic Engine + Cascades

**Project focus:** Progressive Gen (deterministic engine operating on graph layer) + AI Chat Assistant (tool use and function calling)

---

## 1. Core Learning

- [x] Understand OpenAI function calling — how the model selects and calls tools
- [x] Understand the engine operates exclusively on the graph (hot) layer — embeddings are not its concern
- [x] Understand Update Spec config — variables with min/max/derived, cascade rules
- [x] Understand cascade loop detection with a depth limit
- [x] Understand identity-shift detection — only archetype/role/type/backstory changes reach the embedding pipeline

---

## 2. Update Spec Config

- [x] Define `update-spec.json` with at least two variables (`hp`, `mana`) each with `min`/`max` bounds
- [x] Add `derived` formula to at least one variable (`mana_pct` from mana/mana_cap)
- [x] Add at least one cascade rule (hp < 20 → stamina penalty)
- [x] `UpdateSpec` TypeScript type matches the JSON schema

---

## 3. EngineService — Deterministic Graph Mutations

- [x] `clampPatch(patch, spec)` — clamps numeric values to variable min/max; passes unknown keys through
- [x] `computeDerived(state, spec)` — adds derived values (e.g. `mana_pct`) to the resolved state
- [x] `runCascades(state, spec, depth?)` — evaluates cascade rules against state; returns matching apply-patches; depth limit of 5 prevents infinite loops
- [x] `resolveRuleConflict(candidates, conflictKey)` — returns the candidate with the highest priority
- [x] `classifyDeltas(deltas)` — separates `state_mutation` from `identity_shift` deltas
- [x] `applyStateMutationDelta(entityId, patch, spec)` — clamps patch, writes to `graphService.updateEntityState`
- [x] `processDeltas(deltas, spec)` — classifies deltas; writes state mutations AND identity patches; returns `flaggedForReEmbed`
- [x] Identity-shift patches persist to entity identity columns via `graphService.updateEntityIdentity` *(fixed cycle-017)*

---

## 4. EngineToolsService — OpenAI Function Calling

- [x] `getTools()` — returns 3 `ChatCompletionFunctionTool` definitions: `apply_delta`, `fire_cascade`, `resolve_rule_conflict`
- [x] `dispatch(toolCall, spec)` — parses arguments, routes to correct `EngineService` method
- [x] `dispatch` throws `Error('Unknown tool: <name>')` for unrecognised function names

---

## 5. GenerateController Integration

- [x] `processDeltas` called before `buildContexts` when deltas are present in the request
- [x] `flaggedForReEmbed` captured from `processDeltas` return value
- [x] `embeddingService.embedEntityIdentity(id)` called fire-and-forget for each flagged delta

---

## 6. Storage Verification

- [x] `state_mutation` deltas persist to `Entity.state` JSON column with clamping applied
- [x] `identity_shift` deltas persist to `Entity.archetype`/`role`/`backstory` columns
- [x] Vector embedding regenerated after identity shift (`identity_version` incremented)
- [x] `GenerationHistory` table receiving entries (271 rows as of May 16 — logging gap identified)

---

## 7. Success Criteria

- [x] `EngineService` with bounds clamping, derived values, cascades, rule conflict resolution
- [x] `EngineToolsService` exposes engine methods as OpenAI-compatible tool schemas
- [x] Identity-shift detector correctly flags re-embed candidates
- [x] Pure state mutations never trigger embedding API calls
- [x] Engine mutations confined to graph layer
- [x] Pre-generation deltas applied before context build
- [x] Rule conflicts resolved deterministically
- [x] Engine output reproducible (deterministic, no LLM involvement)
- [ ] `GenerationHistory` logging gap resolved (stuck at 271 rows — needs Day 10 investigation)
