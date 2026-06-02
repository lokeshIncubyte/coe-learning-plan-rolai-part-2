# Updates

**Day 7:** Built a hybrid vector+graph retrieval system — entities split into a stable identity layer (embedded once, never re-embedded on state change) and a mutable state layer, so the narrative engine can surface the right characters and active rules for each player action without re-embedding costs growing with session length.

**Day 8:** Added world bootstrapping via document upload — an LLM extractor parses lore files into typed deltas (new entities, identity shifts, state mutations, new edges) and writes them to the graph layer, so players start sessions in a fully seeded world built from uploaded story documents rather than hand-written seed scripts.

**Day 9:** Built the deterministic engine — bounds clamping, derived values, cascades, and rule conflict resolution driven by OpenAI function calling — so player actions mutate world state predictably (hp stays 0–100, low hp triggers stamina cascades, conflicting rules resolve by priority) without the LLM touching the numbers directly.
