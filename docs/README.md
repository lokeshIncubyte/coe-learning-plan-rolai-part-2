# Documentation

Index of project documentation. Start with the [root README](../README.md) for setup and the API reference.

## Map

| Doc | What it covers |
|-----|----------------|
| [roadmap.md](./roadmap.md) | The 10-day build plan (all days complete) |
| [architecture.md](./architecture.md) | Two-layer entity model, two-phase retrieval, the per-beat pipeline, deterministic engine |
| [user-stories.md](./user-stories.md) | Guest / USER / ADMIN stories with acceptance criteria |
| [tdd-post-mortem.md](./tdd-post-mortem.md) | Lessons from Day-8 bugs that passed unit tests but failed at runtime |
| [checklist/](./checklist/) | Per-day learning + delivery checklists (`day-1` … `day-10`) |
| [notes/](./notes/) | Per-day learning notes (OpenAI API, SSE, Next.js, RAG, pgvector, …) |
| [decisions/](./decisions/) | Design decisions and changelog |

## decisions/

| Doc | What it covers |
|-----|----------------|
| [decisions/changelog.md](./decisions/changelog.md) | Dated summary of what each day delivered |
| [decisions/grrm-prompt-writing-style.md](./decisions/grrm-prompt-writing-style.md) | Narrative voice / prose-style guide injected into prompts |

## Related

TDD cycle specs (each documents a RED→GREEN→REFACTOR cycle; some files cover a small range) live with the package they drive. Each folder uses a unique ID prefix so cycle IDs are globally unambiguous:

| Folder | ID prefix | Scope |
|--------|-----------|-------|
| [`../cycles/`](../cycles) | `cycle-NNN` | Days 9–10: engine, persistence, auth, admin, Next.js integration |
| [`../server/cycles/`](../server/cycles) | `srv-NNN` | Days 1–8: backend pipeline, graph, embeddings, extractor |
| [`../client/cycles/`](../client/cycles) | `web-NNN` | Day 6: frontend components + hooks |
| [`../scripts/day-1/cycles/`](../scripts/day-1/cycles) | `scr-NNN` | Day 1: standalone narrative-generator scripts |

The filename, the `id:` frontmatter, and all in-file cross-references share the same prefix.
