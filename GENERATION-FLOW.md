# Generation & Choices Flow

How a single player action becomes a narrative beat with follow-up choices.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PLAYER INPUT                                                                   │
│  "I find Lady Vethara and ask if she needs aid"                                 │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │ POST /api/generate (JWT)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ACTION VALIDATOR  (agents/action-validator.service.ts)                         │
│                                                                                 │
│  LLM call — checks action against rule context                                  │
│  ┌────────────────────────────────────────────────────────┐                    │
│  │ RULE CONTEXT  (graph.service → getEntitiesByType rule) │                    │
│  │  - hp-bounds:        hp stays 0–100, 0 → rest event    │                    │
│  │  - kindness-resolves: conflict resolves via kindness    │                    │
│  └────────────────────────────────────────────────────────┘                    │
│                                                                                 │
│  Result:  accepted ──────────────────────────────────────────────────────────► │
│           rejected ─────────────────────────────────────────► SSE: rejected    │
│           modified ─────────── rewrite prompt ──────────────► SSE: modified    │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │ (accepted or modified prompt)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CONTEXT BUILDER  (generate.controller → buildContexts)                         │
│                                                                                 │
│  Phase 1 — Semantic Recall                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  prompt → embedding (helper-apis, all-MiniLM-L6-v2, 384-dim)            │   │
│  │         → pgvector cosine search  (threshold 0.4, top-8)                │   │
│  │         → Entity rows with scores                                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Phase 2 — Graph Traversal + Re-ranking                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  traversal.service: BFS up to depth 2 from anchor entity                │   │
│  │  scoreWithSemantics: proximity × semantic combined score                 │   │
│  │  top-8 entities selected                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  World Context assembled (per entity):                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  - Name (type): archetype; role; backstory; sensoryProfile               │   │
│  │    [CURRENT STATE — EMOTIONAL STATE: desperate | PHYSICAL STATUS:        │   │
│  │     wounded | hp: 20/100 (critically low) | location: healer's tent]    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │ worldContext + ruleContext
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  NARRATIVE GENERATOR  (narrative-generator.service.ts)                          │
│                                                                                 │
│  System prompt:                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Writing style  (GRRM technique, warm fantasy)                           │   │
│  │  5-step process (mood clause → dominant sense → layers → inner beat)     │   │
│  │  Character type rules (noble/knight/peasant/child/wildling/scout/warg)   │   │
│  │  WORLD CONTEXT block — entity names, backstories, current states         │   │
│  │  HARD CONSTRAINTS — state fields are narrative facts; must be reflected  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Mistral API (mistral-small-latest, T=0.8, max_tokens=200, streaming)           │
│  Tokens stream → SSE chunk events → client accumulates full narrative           │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │ fullNarrative
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  DELTA EXTRACTOR  (upload/extractor.service.ts)  [async, fire-and-forget]       │
│                                                                                 │
│  LLM reads the narrative and emits deltas:                                      │
│  ┌──────────────────────────────────────────────────────────┐                  │
│  │  new_entity     — new person/place/object found          │                  │
│  │  identity_shift — name, archetype, backstory change      │                  │
│  │  state_mutation — hp, mood, location change (by name)    │                  │
│  │  new_edge       — relationship created (by name)         │                  │
│  └──────────────────────────────────────────────────────────┘                  │
│                                                                                 │
│  engine.service.processDeltas → clamp state (UpdateSpec bounds + cascades)     │
│  embedding.service.embedEntityIdentity → re-embed on identity shift             │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │ fullNarrative
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CHOICE GENERATOR  (agents/choice-generator.service.ts)                         │
│                                                                                 │
│  LLM reads the narrative + world context                                        │
│  Returns 2–4 short action choices grounded in the scene                         │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────┐                      │
│  │  e.g.:  "Offer to fetch water from the well"         │                      │
│  │         "Ask who wounded her"                        │                      │
│  │         "Press the warm hearthstone into her hands"  │                      │
│  └──────────────────────────────────────────────────────┘                      │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  HISTORY SERVICE  (history.service.ts)                                          │
│                                                                                 │
│  GenerationHistory row created:                                                 │
│   sessionId, narrative, anchor (top entity id), deltas[], choices[]            │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │ SSE: done → SSE: choices
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CLIENT  (client/app/narrative/)                                                │
│                                                                                 │
│  Beat rendered as typed text                                                    │
│  Choice buttons shown (stored in GenerationHistory.choices)                     │
│  Session sidebar updated                                                        │
│  Clicking a choice repeats the loop ──────────────────────────────────────────►│
└─────────────────────────────────────────────────────────────────────────────────┘


ADMIN PATHS (do not produce narrative)
───────────────────────────────────────

  Lore file / paste text
    ↓  POST /api/upload (multipart)
    ↓  lore-upload.service → chunk text
    ↓  extractor.service.extractDeltas (LLM)
    ↓  extractor.service.applyDeltas
         Pass 1 — create new entities + embed
         Pass 2 — resolve names → edges / mutations
    ↓  Graph updated ─────────────────────────────────────────► surfaced in next beat

  JSON delta panel
    ↓  POST /api/generate  { prompt:'', deltas:[...] }
    ↓  extractorService.applyDeltas (same two-pass logic)
    ↓  Graph updated ─────────────────────────────────────────► surfaced in next beat

  Update-spec editor
    ↓  PUT /api/config/update-spec
    ↓  Saved to server/src/config/update-spec.json
    ↓  engine.service reads it on every delta write-back
```
