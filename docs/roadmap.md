# Progressive Generation — Implementation Programme
**Built atop: Rolai (NestJS + AI) — Part 2: Advanced AI Integration**
**Dual track: AI Chat Assistant + Interactive Narrative Engine**

---

## Day 1 — OpenAI API Basics + Narrative Generator Foundation

**Project:**
- AI Chat Assistant - Start building AI-powered application
- Progressive Gen - Build the core narrative generator
- Learn: OpenAI API fundamentals and authentication
- Setup: Get OpenAI API key and configure environment
- Practice: Making first API call to OpenAI
- Learn: Request parameters (temperature, max_tokens, messages)
- Understand: System, user, and assistant message roles
- Create: Meta directives config file (theme, core principles)
- Create: Style guide config file (voice, tone, format rules)
- Exercise: Build simple narrative generator script in TypeScript
- Exercise: Inject meta + style into system prompt
- Practice: Generate 3 story beats with consistent theme
- Learn: Token counting and cost management
- Practice: Handle API errors and rate limits

**Success Criteria:** Gets OpenAI API key successfully, Makes first successful API call, Understands Chat Completions API, Creates meta directives config, Creates style guide config, Injects always-loaded layer into system prompt, Generates consistent narrative beats across runs, Handles API errors properly, Understands token usage and costs, Knows message role structure

**Resources:**
- 📘 OpenAI API Documentation
- 🔧 OpenAI Quickstart
- 💡 Building AI Applications with ChatGPT APIs

---

## Day 2 — NestJS Backend + Generation Pipeline Skeleton

**Project:**
- AI Chat Assistant - Add AI capabilities to backend
- Progressive Gen - Build service architecture for pipeline
- Learn: OpenAI SDK for Node.js
- Setup: Install openai package in NestJS project
- Exercise: Create NarrativeGeneratorService (replaces ChatService)
- Exercise: Create /api/generate endpoint
- Exercise: Create stub services — GraphService, StateService, EngineService
- Practice: Environment variable management for API keys
- Learn: Service composition patterns in NestJS
- Exercise: Wire endpoint to load meta + style + return generated text
- Exercise: Return hardcoded choices array alongside narrative
- Practice: Error handling for OpenAI API calls
- Exercise: Add request/response logging
- Learn: Rate limiting for generation endpoints

**Success Criteria:** Installs OpenAI SDK in NestJS, Creates NarrativeGeneratorService with OpenAI integration, Implements /api/generate endpoint, Creates stub services for graph and engine, Manages API keys securely, Returns narrative and choice payload, Handles OpenAI errors gracefully, Implements rate limiting, Logs requests and responses, Endpoint works from Postman

**Resources:**
- 📘 OpenAI Node.js SDK
- 🔧 NestJS Configuration
- 🔧 NestJS Modules and Providers

---

## Day 3 — Streaming Responses + Progressive Narrative Reveal

**Project:**
- AI Chat Assistant - Add real-time streaming
- Progressive Gen - Stream narrative as it generates
- Learn: Server-Sent Events (SSE) for streaming
- Understand: OpenAI streaming with stream parameter
- Practice: Implementing SSE in NestJS
- Exercise: Modify generation endpoint to stream narrative
- Exercise: Handle streaming responses chunk by chunk
- Exercise: Stream narrative first, send choices after completion
- Learn: Error handling in streaming
- Practice: Clean up streams on client disconnect
- Exercise: Add typing-indicator support during streaming
- Learn: Benefits of streaming for narrative immersion
- Practice: Test streaming endpoint with curl and SSE clients

**Success Criteria:** Understands SSE for streaming, Implements streaming in NestJS, Streams OpenAI responses chunk by chunk, Handles streaming errors, Cleans up streams properly, Streams narrative text progressively, Sends choices after narrative completes, Backend streams responses successfully

**Resources:**
- 📘 Server-Sent Events
- 🔧 OpenAI Streaming
- 🔧 NestJS SSE

---

## Day 4 — Mastra Framework + Action Validator + Choice Generator

**Project:**
- AI Chat Assistant - Add agentic capabilities with Mastra
- Progressive Gen - Build validator and choice agents
- Learn: What is Mastra and agentic frameworks
- Understand: Agents vs simple API calls
- Setup: Install and configure Mastra
- Learn: Creating agents with Mastra
- Exercise: Build ActionValidator agent — checks if custom action is plausible
- Exercise: Build ChoiceGenerator agent — produces 2–4 valid next choices
- Practice: Agent prompts that consult stubbed state
- Exercise: Validator returns accepted / modified / rejected outcomes
- Exercise: Choice generator returns tagged choices (entities + rules each triggers)
- Exercise: Integrate validator before generation, choice generator after
- Learn: Agent memory and context management
- Practice: Compare Mastra agent vs direct OpenAI calls

**Success Criteria:** Understands Mastra framework concepts, Installs Mastra successfully, Creates ActionValidator agent, Creates ChoiceGenerator agent, Validator returns three-state outcome, Choice generator produces tagged options, Integrates agents into pipeline, Validates custom actions before generation, Generates contextual choices after narrative, Agent endpoints work correctly

**Resources:**
- 📘 Mastra Documentation
- 🔧 Mastra Getting Started
- 🔧 Mastra Tools and Agents

---

## Day 5 — Entity Graph Store with PostgreSQL

**Project:**
- AI Chat Assistant - Add persistent conversation memory
- Progressive Gen - Build entity graph and state persistence
- Learn: Modeling graph data in relational databases
- Exercise: Create Entity model in Prisma (id, type, tags, facts JSON, state JSON)
- Exercise: Create Edge model in Prisma (from, to, type, weight, tags, state JSON)
- Exercise: Create GenerationHistory model (narrative, anchor, deltas JSON)
- Implement: Many-to-many relationships between entities via edges
- Exercise: Implement GraphService with CRUD for entities and edges
- Exercise: Query entities by ID, type, and tags
- Practice: Update entity state and edge weights
- Exercise: Write seed script with 8-10 entities + edges + 2-3 rules
- Learn: JSON column patterns for flexible schemas
- Exercise: Add conversation/session model linking generations to a user session
- Practice: Pagination for generation history
- Exercise: Replace hardcoded choices with real entity-aware data

**Success Criteria:** Creates Entity and Edge models in Prisma, Models facts and state as JSON columns, Implements one-to-many and many-to-many relationships, Saves all generations to GenerationHistory, GraphService supports full CRUD, Queries by type and tag work, Seed script creates initial world successfully, Updates state and edge weights correctly, Validates new schema with test queries, Replaces stub data in agents from Day 4

**Resources:**
- 📘 Prisma Schema Design
- 🔧 PostgreSQL JSON columns

---

## Day 6 — Next.js Narrative UI with Choices

**Project:**
- AI Chat Assistant - Build interactive chat interface
- Progressive Gen - Build choice-based narrative interface
- Exercise: Create narrative page in Next.js
- Learn: Building narrative UI components (text panel, choice buttons, input)
- Practice: Real-time narrative display with streaming
- Exercise: Implement choice buttons (2-4 dynamic options)
- Exercise: Add custom action text input below choices
- Practice: Display validation feedback for custom actions (accepted/modified/rejected)
- Learn: Optimistic UI updates and rollback on rejection
- Exercise: Display narrative history (previous beats scrollable above)
- Practice: Highlight user's past choices in history
- Exercise: Connect frontend to streaming /api/generate endpoint
- Exercise: Implement streaming response display in UI
- Practice: Handle errors and retry mechanisms
- Learn: Scroll-to-bottom on new narrative beats

**Success Criteria:** Creates narrative page in Next.js, Builds narrative panel with streaming text, Displays 2-4 choice buttons dynamically, Implements custom action input field, Shows validation feedback inline, Renders narrative history scrollback, Connects to streaming endpoint, Displays streaming narrative in real-time, Handles errors with retry, Smooth choice-narrative-choice loop, UI works smoothly end-to-end

**Resources:**
- 📘 Next.js Server Actions
- 🔧 React streaming UI patterns
- 🔧 SSE client libraries

---

## Day 7 — Hybrid Vector + Graph Architecture + Traversal Engine + Rule Evaluator

**Project:**
- AI Chat Assistant - Add knowledge base with RAG
- Progressive Gen - Build hybrid vector + graph entity store with two-phase retrieval
- Learn: What is RAG (Retrieval Augmented Generation)
- Understand: Why mutable entities break naive RAG — re-embedding on every state change is cost-prohibitive
- Learn: The hybrid vector + graph pattern — split identity (cold) from state (hot)
- Learn: OpenAI Embeddings API and pgvector
- Setup: pgvector extension for PostgreSQL
- Exercise: Split the `Entity` model into identity fields (name, type, archetype, backstory, tags) and state fields (state JSON, edge weights, last_beat)
- Exercise: Add `embedding vector(1536)` column to the identity layer only
- Exercise: Generate embeddings from identity fields (name + type + archetype + backstory) — never from mutable state
- Exercise: Implement the re-embedding rule — only re-embed on semantic identity shift (role change, destruction), never on state mutation
- Practice: Optional refinement — embed archetypes/types instead of instances for maximum stability
- Learn: Vector similarity search (cosine similarity, `<=>` operator)
- Exercise: Implement Phase 1 — Semantic Recall (pgvector cosine search returns candidate entity IDs)
- Exercise: Implement Phase 2 — State Enrichment (PostgreSQL joins fetch current state, edge weights, recent deltas for those IDs)
- Exercise: Build TraversalService — operates on graph-layer data returned by Phase 2 (weighted edge walk, depth limit, tag filter)
- Exercise: Combine graph proximity with semantic similarity scoring from Phase 1
- Exercise: Build RuleEvaluator — reads rule entities from graph layer, filters by current state from Phase 2
- Exercise: Implement rule trigger conditions (entity-presence, state-value, relationship)
- Exercise: Score rules by specificity, priority, scope
- Practice: Surface contradictions to LLM explicitly
- Exercise: Inject traversed entities (with live state) and active rules into prompt

**Success Criteria:** Understands RAG concepts, Understands why mutable entities require splitting identity from state, Sets up pgvector in PostgreSQL, Splits Entity model into identity layer (embedded) and state layer (mutable), Generates embeddings from identity fields only, Implements two-phase retrieval (semantic recall → state enrichment), Re-embedding only fires on semantic identity shift, State mutations do NOT trigger re-embedding, TraversalService operates on graph-layer data, Weighted edge traversal works with thresholds, Tag-filtering respects current phase, RuleEvaluator filters rules by triggers using live state, Conflict resolution by specificity works, Active rules injected into generation prompt, Generation now uses two-phase retrieved context

**Resources:**
- 📘 RAG Overview
- 🔧 OpenAI Embeddings
- 🔧 pgvector
- 💡 Hybrid retrieval patterns (vector + structured store)

---

## Day 8 — Document Upload + World Bootstrap + Identity-Aware Extractor

**Project:**
- AI Chat Assistant - Add document upload for knowledge base
- Progressive Gen - World bootstrapping + delta extraction with identity/state split
- Exercise: Create document upload endpoint in NestJS
- Learn: Processing text from PDFs and documents
- Practice: Chunking documents into entity-sized units
- Exercise: Build LoreUploadService — upload world docs, extract entities
- Learn: How identity/state split shapes extraction — extractor must separate "who/what this is" (identity, will be embedded) from "current condition" (state, will not)
- Exercise: ExtractorService writes identity fields and initial state in distinct payload sections
- Exercise: Auto-tag and link extracted entities to existing graph (graph layer write)
- Exercise: Generate embeddings for new entities — from identity fields only, once, at creation
- Exercise: Build document upload UI in Next.js (world seeding)
- Exercise: Define Delta schema with explicit op categories — `identity_shift` (rare, triggers re-embedding) vs `state_mutation` (common, no re-embedding) vs `new_entity` vs `new_edge`
- Exercise: Build ExtractorService — small LLM parses narrative into deltas, tags each delta with its category
- Practice: Structured output with JSON mode
- Exercise: Extractor auto-links new entities to current anchor
- Practice: Citation tracking — link entities back to source narrative
- Exercise: Log all deltas to GenerationHistory with their category for auditability
- Learn: Schema-constrained LLM responses for reliability

**Success Criteria:** Creates document upload endpoint, Processes PDF and text files, Chunks documents into entities, Extractor separates identity from state in its output, Generates embeddings from identity fields only, Builds world upload UI in frontend, Defines Delta schema with identity-shift vs state-mutation categories, ExtractorService tags every delta by category, New entities auto-link to anchor, Citations track entity origins, All deltas logged to history with categories, World bootstrap pipeline respects the two-layer architecture end-to-end

**Resources:**
- 📘 File upload in NestJS
- 🔧 PDF processing libraries
- 🔧 OpenAI JSON mode

---

## Day 9 — Function Calling + Deterministic Engine + Cascades (Graph-Layer Only)

**Project:**
- AI Chat Assistant - Add tool use and function calling
- Progressive Gen - Build deterministic engine that mutates the graph layer without touching embeddings
- Learn: OpenAI function calling capabilities
- Understand: When to use function calling vs RAG
- Learn: Engine operates exclusively on the graph (hot) layer — embeddings are not its concern
- Exercise: Define Update Spec config (YAML/JSON) per state variable
- Exercise: Spec includes min/max bounds, derived values, cascade rules
- Exercise: Build EngineService — reads spec, validates deltas, applies them to the graph layer
- Exercise: Implement bounds clamping (e.g., health 0–100) — pure state mutation, never re-embeds
- Exercise: Implement derived value computation — graph-layer only
- Exercise: Implement cascade triggers (state change → more state changes) — all confined to graph layer
- Practice: Cascade loop detection with max depth limit
- Exercise: Define functions for engine to call (apply_delta, fire_cascade, resolve_rule_conflict)
- Exercise: Add identity-shift detector — engine inspects incoming deltas and flags ones that change semantic identity (archetype/role/type change, destruction); only these are forwarded to the embedding pipeline
- Practice: Engine returns resolved deltas before write-back; identity-shift deltas trigger an async re-embed job, state mutations do not
- Exercise: Pre-generation delta application (user action → graph mutation, embeddings untouched)
- Learn: Rule conflict resolution at runtime
- Practice: Multi-step engine reasoning combining functions
- Exercise: Surface contradictions to next generation cycle

**Success Criteria:** Understands function calling concept, Defines Update Spec with schemas, Implements EngineService with bounds clamping, Computes derived values correctly, Fires cascades on state change, Handles cascade loops with depth limit, Engine mutations are confined to the graph layer, Identity-shift detector correctly flags re-embed candidates, Pure state mutations never trigger embedding API calls, Pre-generation deltas applied correctly, Rule conflicts resolved deterministically, Engine output is reproducible, Engine prevents invalid state, Integrates engine into pipeline before write-back

**Resources:**
- 📘 OpenAI Function Calling
- 🔧 Function calling examples
- 🔧 YAML/JSON config patterns

---

## Day 10 — Production Features + Full Pipeline + Deployment

**Project:**
- AI Chat Assistant - Polish and deploy complete application
- Progressive Gen - Complete integration and ship the system
- Exercise: Wire full pipeline end-to-end (action → validator → engine → graph mutation → Phase 1 semantic recall → Phase 2 state enrichment → rules → prompt → generator → extractor → engine → write-back → choices)
- Exercise: Add user authentication for sessions
- Exercise: Implement per-user world isolation (session-scoped graphs; vector layer can stay shared for archetype embeddings)
- Practice: Rate limiting for generation endpoints
- Learn: Monitoring AI API usage and costs — note that embedding spend is bounded by design, not by cache strategy
- Exercise: Build session save/load (graph snapshots — only the hot layer needs snapshotting per session)
- Exercise: Add session export/sharing functionality
- Exercise: Implement export of generation history
- Practice: Error handling and fallbacks across pipeline
- Learn: Caching strategies — embeddings are stable by design (only re-embed on identity shift), so the cache is trivial; focus caching effort on Phase 2 joins and traversal results
- Exercise: Build config editor UI (meta, style, entities, rules, update spec)
- Exercise: Build admin dashboard (graph size, state values over time, embedding count vs re-embed events, costs)
- Practice: Telemetry for each pipeline stage — track Phase 1 latency, Phase 2 latency, identity-shift frequency separately
- Exercise: Deploy complete system (backend + frontend + database with pgvector)
- Create: Architecture diagram (two-layer split, two-phase retrieval flow) and usage documentation
- Create: Deployment and operations documentation

**Success Criteria:** Full pipeline integrated end-to-end with two-phase retrieval, Adds user auth and session isolation, Implements rate limiting, Monitors API usage and costs, Embedding spend stays flat as session length grows (proof the architecture works), Session save/load works on graph layer, Implements session export, Handles all errors gracefully, Caches Phase 2 joins and traversal results effectively, Config editor allows non-code edits to world, Admin dashboard shows live state and re-embed events, Deploys complete application, Documents two-layer architecture and deployment, Progressive Generation system is production-ready

**Resources:**
- 📘 NestJS Rate Limiting
- 🔧 Production deployment best practices
- 🔧 Observability for AI pipelines

---

## Cross-Reference Matrix

| Day | Rolai Skill | PRD Component Delivered |
|-----|-------------|------------------------|
| 1 | OpenAI API basics | Always-Loaded Layer + Generator (§5.1, §5.6) |
| 2 | NestJS integration | Pipeline orchestration backbone (§5) |
| 3 | Streaming/SSE | Progressive narrative UX (§7.1, §9) |
| 4 | Mastra agents | Action Validator + Choice Generator (§5.9, §5.10) |
| 5 | PostgreSQL + Prisma | Graph Store + Data Model (§5.2, §6.1, §6.2) |
| 6 | Next.js chat UI | Interactive narrative interface (F1, §7) |
| 7 | RAG + pgvector | Hybrid Vector/Graph Store + Two-Phase Retrieval + Rule Evaluator (§5.3, §5.4) |
| 8 | Document upload | Identity-Aware World Bootstrap + Extractor (§5.7, §6.4) |
| 9 | Function calling | Deterministic Engine (graph-layer) + Update Spec (§5.8, §6.5) |
| 10 | Production deployment | Full system integrated + shipped (§13) |

---

## Notes for Implementers

- Each day fulfills BOTH the Rolai learning objective AND a Progressive Gen component
- Stub services on Day 2 get replaced with real implementations on Days 5, 7, 8, 9
- Mastra agents (Day 4) start with stubbed state, get wired to real graph on Day 5+
- UI (Day 6) starts simple, gets richer as backend matures
- **Day 7 is the architectural pivot:** entities split into a cold vector layer (identity, embedded once) and a hot graph layer (state, edges, mutated freely). All subsequent days respect this split.
- **Embeddings are write-rare by design.** Day 9's engine is allowed to mutate state at will because state lives in the graph layer; only identity-shift deltas reach the embedding pipeline.
- **Two-phase retrieval is the read path for the rest of the system.** Phase 1 (semantic recall on vector layer) narrows candidates; Phase 2 (state enrichment via SQL joins on graph layer) attaches live data. TraversalService and RuleEvaluator both consume Phase 2 output.
- By Day 10, you have completed Rolai's AI Chat Assistant AND a working Progressive Generation Engine — same codebase, two valid framings