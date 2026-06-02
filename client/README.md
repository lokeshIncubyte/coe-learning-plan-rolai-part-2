# client — Narrative Engine UI (Next.js)

The frontend for the Progressive Generation Engine. Renders the streaming narrative, choices, custom-action validation, lore upload, and the admin view. Also hosts **BFF proxy routes** under `app/api/*` that attach the bearer token and forward to the NestJS API. See the [root README](../README.md).

> Note: this project tracks a build of Next.js with breaking API changes — see [`AGENTS.md`](./AGENTS.md). Consult `node_modules/next/dist/docs/` before writing code against framework APIs.

## Running

```bash
npm install
npm run dev   # http://localhost:3000
```

Expects the NestJS API on port 3001 and `helper-apis` on 4000 (see root README).

## Structure

```
app/
├── login/                 # auth form
├── narrative/             # the game loop
│   ├── components/         # NarrativePanel, ChoiceList, ActionInput, BeatHistory, RetryButton, …
│   ├── hooks/              # useStream (SSE), useNarrativeHistory, useAuthGuard, …
│   └── lib/                # stream-event parsing
├── upload/                # lore upload panel
├── admin/                 # admin stats page
└── api/                   # BFF proxy routes → NestJS
    ├── auth/login/
    ├── generate/  +  generate/stream/
    └── admin/stats/
```

## Testing

```bash
npm test          # component tests (Jest + React Testing Library)
npm run e2e       # Playwright against a mocked API
npm run e2e:ui    # Playwright UI mode
```

A **live** e2e suite (`e2e/live.spec.ts`, config `playwright.live.config.ts`) drives the real game loop against a running NestJS + helper-apis + OpenRouter stack — no mocking.
