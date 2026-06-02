---
id: srv-028
slug: entity-identity-schema
status: done
source: "Group A: Add identity layer fields to Entity model in Prisma schema"
covers: schema-migration
---

## Behavior
`server/prisma/schema.prisma` gains an identity layer on the `Entity` model: `archetype String?`, `backstory String?`, `role String?`, `identity_version Int @default(0)`, `embedding Unsupported("vector(384)")?`, and `last_beat String?`. These fields encode the two-layer architecture: identity fields (archetype, backstory, role) are embedded once and only re-embedded on semantic shift; state fields (state JSON, last_beat) are mutated freely and never trigger an embedding call.

## RED
- **Test file**: none — schema-only migration
- **Assertion**: No unit assertion. Without this schema change, the Prisma-generated `Entity` type lacks `archetype`, `identity_version`, and `embedding`, so `EmbeddingService` (srv-029 onward) would fail TypeScript compilation when accessing those fields.
- **Why it fails**: `server/prisma/schema.prisma` does not define identity-layer columns; Prisma client has no `archetype`, `backstory`, `role`, `identity_version`, or `embedding` field on `Entity`.

## GREEN
- **Smallest change**: Add the six new fields to the `Entity` model block in `server/prisma/schema.prisma`. Copy the exact field definitions from the worktree schema at `.claude/worktrees/day-7-hybrid-vector-graph/server/prisma/schema.prisma` — the 384-dim `vector` type and the comment block explaining when re-embedding fires must be preserved verbatim.
- **Files touched**: `server/prisma/schema.prisma`

## REFACTOR
none
