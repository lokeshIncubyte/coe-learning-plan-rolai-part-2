# Day 8 Checklist — Document Upload + World Bootstrap + Identity-Aware Extractor

**Project focus:** Progressive Gen (world bootstrapping + delta extraction with identity/state split) + AI Chat Assistant (document upload for knowledge base)

---

## 1. Core Learning

- [ ] Understand how document upload works in NestJS — `@UploadedFile()`, `multer`, `FileInterceptor`
- [ ] Understand chunking strategies — why entity-sized chunks work better than fixed-size ones for a narrative world
- [ ] Understand how the identity/state split shapes extraction — the LLM must produce two distinct payload sections: "who/what this is" (identity → will be embedded) vs "current condition" (state → will not)
- [ ] Understand structured output with JSON mode — why schema-constrained responses are more reliable than free-text for machine-readable deltas
- [ ] Understand Delta categories — `identity_shift` (rare, triggers re-embedding), `state_mutation` (common, no re-embedding), `new_entity`, `new_edge`

---

## 2. Document Upload Endpoint (NestJS)

> **TDD:** Plan cycles before implementing. Document upload is independently testable with mock file buffers.

- [ ] Create `POST /api/upload` endpoint in NestJS — accepts multipart file upload
- [ ] Support PDF and plain text file types
- [ ] Extract raw text from PDF using a Node.js PDF library (e.g. `pdf-parse`)
- [ ] Return extracted text or a processing receipt to the caller

---

## 3. LoreUploadService

> **TDD:** Use `/plan-cycle`. Upload processing and entity extraction are independently testable.

- [ ] `processUpload(fileBuffer, mimeType)` — extracts raw text from the uploaded file
- [ ] `chunkIntoUnits(text)` — splits the document into entity-sized narrative chunks suitable for extraction
- [ ] `extractAndPersist(chunks)` — calls `ExtractorService` on each chunk, writes results to the graph layer

---

## 4. ExtractorService — Identity/State Split

> **TDD:** Each extraction operation is independently testable with mocked LLM responses. The Delta schema validates the output.

- [ ] Define `Delta` schema with explicit `op` categories:
  - `new_entity` — identity fields + initial state in separate sections
  - `identity_shift` — changes to name/type/archetype/backstory/role (rare, triggers re-embedding)
  - `state_mutation` — changes to `state` JSON only (common, no re-embedding)
  - `new_edge` — directed relationship between two entities
- [ ] `extractDeltas(chunk)` — sends chunk to LLM with JSON mode; parses response into `Delta[]` using the schema
- [ ] Extractor prompt enforces the split — identity fields in `identity` block, mutable conditions in `state` block
- [ ] `applyDeltas(deltas)` — writes each delta to the graph layer via `GraphService`; `identity_shift` deltas fire `onEntityWrite` hook; `state_mutation` deltas do not
- [ ] Auto-link new entities to the current anchor entity in the graph (create `new_edge` delta automatically)
- [ ] Citation tracking — persist source chunk reference on each created entity for auditability

---

## 5. Delta Logging

> **TDD:** Logging is independently testable — mock the `GenerationHistory` write and assert the delta category is recorded.

- [ ] Log all deltas to `GenerationHistory` with their `op` category
- [ ] `identity_shift` deltas are flagged distinctly from `state_mutation` deltas in the log
- [ ] Logged entries are queryable by category for debugging and replay

---

## 6. World Upload UI (Next.js)

> **TDD:** Use `/plan-cycle` for the frontend component. File selection and upload progress are independently testable.

- [ ] File picker component — accepts PDF and `.txt` files
- [ ] Upload progress indicator — shows processing state while the server extracts entities
- [ ] Display extracted entity summary after upload completes (count of entities/edges created)
- [ ] Add to the narrative UI as a "World Seeding" panel or route

---

## 7. Re-Embedding Invariant

> These are architectural constraints, not new code — verify the existing pipeline respects them end-to-end with real uploaded data.

- [ ] `identity_shift` deltas → `onEntityWrite` hook fires → `shouldReembed` returns true → `embedEntityIdentity` called → `identity_version` incremented
- [ ] `state_mutation` deltas → `onEntityWrite` hook fires → `shouldReembed` returns false → no embedding call, no `identity_version` change
- [ ] `new_entity` deltas → `embedEntityIdentity` called once at creation → embedding written to vector column

---

## 8. Success Criteria

- [ ] `POST /api/upload` accepts PDF and text files and extracts raw text
- [ ] Documents are chunked into entity-sized units
- [ ] `ExtractorService` produces `Delta[]` with explicit `op` categories from each chunk
- [ ] Extractor prompt separates identity fields from state fields in its output
- [ ] `new_entity` deltas create entities with embeddings generated from identity fields only
- [ ] `identity_shift` deltas trigger re-embedding; `state_mutation` deltas do not
- [ ] New entities are auto-linked to the current anchor via `new_edge` delta
- [ ] Citations link each entity back to its source chunk
- [ ] All deltas logged to `GenerationHistory` with their category
- [ ] World upload UI built in Next.js — file picker, progress, entity summary
- [ ] Full world bootstrap pipeline respects the two-layer identity/state architecture end-to-end
