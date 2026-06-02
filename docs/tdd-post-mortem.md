# TDD Cycle Post-Mortem: Day 8 Lore-Upload Bugs

## Context

Day 8 implemented the lore-upload feature (ExtractorService, LoreUploadService, UploadController, GenerationHistoryService.logUploadDeltas) via strict TDD. All 17 cycles passed (112/112 unit tests green) but the following bugs only surfaced at runtime during e2e verification.

---

## Per-Bug Analysis

### Bug 1 — Prisma FK violation (`sessionId: 'upload'`)

**Owning cycle:** `srv-066` (`lore-upload-service-log-deltas`)

**What the cycle tested:** `LoreUploadService.extractAndPersist` mocked `historyService.logUploadDeltas` as `jest.fn().mockResolvedValue(undefined)` and asserted it was called with `(0, deltas)`. No cycle ever executed the real `logUploadDeltas` implementation.

**Why the bug was invisible:** The FK constraint `GenerationHistory.sessionId → Session.id` (schema.prisma lines 63–72) was never encoded as an assertion. The hardcoded string `'upload'` is not a valid session ID. The cycle's GREEN block acknowledged a `Session` is required but no RED assertion proved it was created first — only that the method was called.

**Root cause category:** (d) db-constraint-not-modeled + (a) mock-hiding-contract

---

### Bug 2 — LLM hallucinated entity IDs causing FK errors in `new_edge`

**Owning cycle:** `srv-062` (`extractor-service-apply-new-edge`)

**What the cycle tested:** `mockGraph.createEdge` was hardcoded to resolve (`jest.fn().mockResolvedValue({ id: 'edge1' })`). Asserted `createEdge` was called with the right shape and `edgeCount` incremented.

**Why the bug was invisible:** Cycle is `covers: happy-path`. The mock cannot fail. No companion error-path cycle exists for "createEdge rejects with FK violation → applyDeltas must catch and continue." `Edge.fromId` and `Edge.toId` are FKs to `Entity.id` (schema.prisma lines 59–60) — contract visible in schema but never asserted against.

**Root cause category:** (b) missing-error-path-cycle

---

### Bug 3 — `source?` missing from `NewEntityDelta` type

**Owning cycles:** `srv-058` (defines `Delta` union) + `srv-064` (`extractor-service-apply-citation`)

**What the cycle tested:** Cycle 064 built a `NewEntityDelta` literal with a `source` property and asserted it forwarded to `createEntity`. Test passed at runtime because the literal bypassed TypeScript's structural type check on the union.

**Why the bug was invisible:** The LLM system prompt instructs the model to return a `source` field; the `NewEntityDelta` TypeScript type didn't declare it. No cycle bound the prompt's documented schema to the type definition. The field is used in cycle 064 but the type was defined in cycle 058 — two different cycles, no joint ownership of the contract.

**Root cause category:** (c) external-contract-not-read + (e) type-not-validated-at-boundary

---

### Bug 4 — `pdf-parse` v2 API incompatibility

**Owning cycle:** `srv-056` (`lore-upload-service-process-upload-pdf`)

**What the cycle tested:** `jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'extracted pdf text' }))`. Asserted `pdfParse(buf)` was called and returned text.

**Why the bug was invisible:** The mock *invented* the shape of `pdf-parse`'s public API. The real v2 library exports `{ PDFParse }` as a named class — not a default callable function. The production code used `pdfParse(buffer)` which crashes at runtime with "Class constructors cannot be invoked without 'new'." The test passed because the Jest mock replaced the entire module with a callable function, making both the production code and the test pass against a fictitious API. The installed `.d.ts` was never consulted.

**Root cause category:** (a) mock-hiding-contract + (c) external-contract-not-read

---

### Bug 5 — Malformed PDF → 500 instead of 400

**Owning cycle:** `srv-056` (missing sibling)

**What the cycle tested:** Only the happy path. Mock resolves with `{ text: 'extracted pdf text' }`. No assertion for the rejection path.

**Why the bug was invisible:** No companion cycle covers `pdf-parse rejects → service throws BadRequestException`. The mock uses `mockResolvedValue` — it cannot reject. Cycle 068 (controller) also only asserts happy path; no assertion that `InvalidPDFException` maps to an HTTP 400.

**Root cause category:** (b) missing-error-path-cycle

---

### Bug 6 — `@types/multer` missing; `Express.Multer.File` brittle under DI

**Owning cycle:** `srv-068` (`upload-controller-post`)

**What the cycle tested:** Controller instantiated with `new UploadController(mockSvc as any)`, fake file cast as `as Express.Multer.File`. Method called directly; Jest mock resolves.

**Why the bug was invisible:** Three independent reasons:
1. `new UploadController(...)` bypasses Nest's DI container — module wiring, multer interceptor type resolution, and provider graph are never exercised.
2. `as Express.Multer.File` is a TypeScript assertion, not a verification — the type definition package (`@types/multer`) may not even be installed.
3. `tsc --noEmit` was not part of the GREEN evidence gate. Tests passed; compile was never verified.

**Root cause category:** (e) type-not-validated-at-boundary

---

## Summary Table

| # | Bug | Owning Cycle | Category |
|---|-----|-------------|----------|
| 1 | `sessionId: 'upload'` FK violation | srv-066 | (d) db-constraint-not-modeled + (a) mock-hiding-contract |
| 2 | LLM hallucinated edge endpoints | srv-062 | (b) missing-error-path-cycle |
| 3 | `source?` missing from `NewEntityDelta` | srv-058 + srv-064 | (c) external-contract-not-read + (e) type-not-validated-at-boundary |
| 4 | `pdf-parse` v2 API mismatch | srv-056 | (a) mock-hiding-contract + (c) external-contract-not-read |
| 5 | Malformed PDF → 500 | srv-056 (missing sibling) | (b) missing-error-path-cycle |
| 6 | `@types/multer` missing | srv-068 | (e) type-not-validated-at-boundary |

---

## Root Cause Patterns

### Pattern 1 — Happy-path mono-culture

Every cycle in the 055–068 batch is `covers: happy-path` or `covers: atomic`. Not one is `covers: error-path`. Bugs 2 and 5 follow directly.

> **Rule:** Any cycle that calls an external boundary (DB, LLM, file parser, HTTP client) requires a sibling cycle whose mock **rejects** and whose RED asserts the caller catches/translates/propagates correctly. A cycle for `applyDeltas → createEdge` without a `createEdge-rejects` sibling is incomplete by definition.

### Pattern 2 — The test invents the dependency's API

The `pdf-parse` mock and the `logUploadDeltas` mock were written from the author's assumption of the API, not from the installed `.d.ts` or `schema.prisma` constraints. The mock confirmed only that the code calls *something* with *some* shape — not that the real dependency accepts that shape.

> **Rule:** For any `jest.mock('<pkg>')` or mocked Prisma model, the cycle's RED block must pin the real signature — quoting the relevant line from the installed `.d.ts` (for npm packages) or the `schema.prisma` field with its constraints (for DB). If you can't quote it, you can't mock it.

### Pattern 3 — Type assertions as decoration, not verification

`as Express.Multer.File`, constructing a `NewEntityDelta` literal with an undeclared extra field — TypeScript was used to silence the compiler, not to verify correctness. `tsc --noEmit` was never part of the GREEN evidence gate.

> **Rule:** `tsc --noEmit` must be part of every GREEN proof step, alongside the Jest run. For objects crossing a process boundary (LLM JSON → `Delta`, multipart body → `MulterFile`), the cycle must specify a runtime validator and assert that an invalid shape is rejected, not just that a valid shape forwards.

### Pattern 4 — Unit tests that bypass Nest's DI

Controller cycles used `new UploadController(...)` directly, proving nothing about whether the Nest module can compile, whether interceptor types resolve, or whether providers are wired correctly.

> **Rule:** Every controller-layer cycle needs a module-wiring assertion using `Test.createTestingModule({ controllers, providers }).compile()`. This is ~5 lines, surfaces missing-type and missing-provider errors immediately, and proves the DI graph is valid.

### Pattern 5 — System-prompt / type / consumer drift

The LLM system prompt specified `source` on `new_entity` deltas; the TypeScript type didn't declare it; a downstream cycle used it. Three files, two cycles, no single point of ownership.

> **Rule:** Any cycle that modifies a system prompt must also update and assert on the corresponding TypeScript type in the same cycle. The prompt's documented output schema and the TypeScript type are a single atomic unit of change.
