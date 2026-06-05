# CLAUDE.md — Project conventions for Claude Code

## Never do automatically

- **Never start or restart the NestJS server** (`server/`). Only apply code fixes and wait.
  The user controls when services start.
- Never run `prisma migrate dev` — the migration history has drifted. Use `prisma db push` instead.
- Never commit unless the user explicitly asks.

## Server startup (for reference only — user runs this)

```bash
./start.sh          # creates DB container, migrates, seeds, starts all 3 services
```

Or individually:
```bash
cd helper-apis && npm run dev          # :4000 — local embeddings
cd server && npm run start:dev         # :3001 — NestJS API (watch mode)
cd client && npm run dev               # :3000 — Next.js UI
```

## Demo scenarios

Three demo scenarios live in `demos/`. Use them to show the full pipeline:
entity injection → embedding → semantic recall → narrative grounding.

```bash
node demos/seed-scenario.mjs list                     # show available scenarios
node demos/seed-scenario.mjs seed 01-injured-healer   # Lady Vethara — hp:20, desperate
node demos/seed-scenario.mjs seed 02-stat-update      # Gareth Scout — hp:15, shaken
node demos/seed-scenario.mjs seed 03-new-location     # Amber Forge — abandoned location
node demos/seed-scenario.mjs clean                    # remove all demo entities
```

Each `seed` command:
1. Deletes all non-seed-world entities from the DB (safe — never touches Cavern/Thornwall/etc.)
2. Injects the scenario's entities via the admin `/api/generate` endpoint (runs embeddings too)
3. Prints suggested prompts to try in the chat

To switch scenario during a demo:
```bash
node demos/seed-scenario.mjs seed 02-stat-update      # switches from any other scenario
```

### Automated test loop

```bash
node demos/test-loop.mjs                              # runs default (injured-healer)
node demos/test-loop.mjs demos/01-injured-healer.mjs
node demos/test-loop.mjs demos/02-stat-update.mjs
node demos/test-loop.mjs demos/03-new-location.mjs
```

The loop: injects entity → generates narrative → checks assertions → cleans up → retries (up to 3×).
The THROTTLE_LIMIT env var is set to 30 in `server/.env` to support the test loop.

## Key architecture reminders

- **Rate limiting**: NestJS throttler is global (all proxied BFF requests share one IP bucket).
  `THROTTLE_LIMIT=30` in `server/.env`.
- **Embeddings**: Entities injected via delta panel get embedded by `extractorService.applyDeltas`,
  NOT `engineService.processDeltas` (which only handles mutations/shifts).
- **pgvector cosine threshold**: 0.4 — entities with similarity below this won't surface.
- **State in world context**: Formatted as `[CURRENT STATE — EMOTIONAL STATE: ... | hp: N/100 ...]`
  with explicit narrative directives so the LLM reflects the state in generated prose.
- **Prisma raw queries**: Use `$executeRawUnsafe`/`$queryRawUnsafe` for pgvector — tagged template
  versions misparse vector literals.

## Generation flow

See `GENERATION-FLOW.md` at the repo root for the full ASCII flowchart.

## Testing

```bash
cd server && npm test            # unit (Jest)
cd client && npm test            # component tests
cd client && npm run e2e         # Playwright (mocked)
# Live e2e (needs all 3 services running):
cd client && npx playwright test --config=playwright.live.config.ts
```
