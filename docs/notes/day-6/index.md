# Day 6 — Next.js Narrative UI with Choices

## New Technologies & Patterns

### 1. Next.js App Router — File-System Routing

The `app/` directory is the router. A folder = a URL segment.
A route is only public when it contains `page.tsx`.

```
  app/
  ├── layout.tsx          → wraps every page (persistent shell, nav, fonts)
  ├── page.tsx            → GET /   (home)
  └── narrative/
      └── page.tsx        → GET /narrative

  Render hierarchy (outer → inner):
  layout → error boundary → loading skeleton → page

  Server vs Client split:
  ┌──────────────────────────────────────────────────────────┐
  │  app/narrative/page.tsx                                   │
  │  (Server Component — default)                             │
  │                                                           │
  │  Can: async/await, read env vars, fetch at build time     │
  │  Cannot: useState, useEffect, onClick, browser APIs       │
  │                                                           │
  │  └── <NarrativePanel />      ← 'use client'              │
  │       Can: hooks, events, window, SSE fetch              │
  │       Cannot: server-only secrets, Node.js APIs          │
  └──────────────────────────────────────────────────────────┘

  Rule: push 'use client' as deep as possible — every import
  in a 'use client' file becomes client-bundle JavaScript.
```

---

### 2. SSE Client — `fetch` + `ReadableStream`

The browser's `EventSource` API only supports GET with no body.
Our SSE endpoint needs a JSON body (the player's action), so we use `fetch`:

```
  EventSource (cannot use here)        fetch + ReadableStream (what we use)
  ┌───────────────────────────┐        ┌───────────────────────────────────┐
  │ GET only                  │        │ POST with JSON body                │
  │ no custom headers         │        │ custom Authorization header        │
  │ auto-reconnect built-in   │        │ AbortController for cancellation  │
  │ simple API                │        │ manual buffer-and-split parsing   │
  └───────────────────────────┘        └───────────────────────────────────┘

  fetch stream reading loop:

  response.body                     (ReadableStream<Uint8Array>)
      │
      ▼ getReader()
  reader.read()  → { value: Uint8Array, done: boolean }
      │
      ▼ TextDecoder.decode(value, { stream: true })
  raw text (may contain partial events)
      │
      ▼ buffer + split on '\n\n'
  complete SSE event strings
      │
      ▼ parse 'data: {...}' lines
  typed event objects → dispatch to React state
```

Critical gotcha — chunks do NOT align with SSE event boundaries:

```
  One reader.read() call may return:

  Case A — multiple events in one chunk:
    "data: {type:'chunk',content:'The'}\n\ndata: {type:'chunk',content:' sun'}\n\n"

  Case B — event split across two chunks:
    Chunk 1: "data: {type:'chunk',con"
    Chunk 2: "tent:'The sun'}\n\n"

  Fix: accumulate in a buffer, only process complete events (split by '\n\n'),
       hold the trailing incomplete segment for the next chunk.
```

---

### 3. Optimistic UI — React 19 `useOptimistic`

Show the player's action immediately in the UI, before the server validates it.
Roll back automatically if the server rejects it — no manual state cleanup needed.

```
  Player clicks choice / submits action
            │
            ▼
  startTransition(() => {
    setOptimistic(action)   ← appears in UI instantly (status: 'pending')
    dispatchValidate(action) ← SSE stream starts
  })
            │
            ▼
  ┌─────────────────────────────────────────────┐
  │  SSE events arrive:                          │
  │                                             │
  │  { type: 'accepted' }                       │
  │    → optimistic state confirmed             │
  │    → status flips to 'accepted'             │
  │                                             │
  │  { type: 'modified', modifiedAction: '...' }│
  │    → optimistic text replaced with modified │
  │    → status flips to 'modified'             │
  │                                             │
  │  { type: 'rejected', reason: '...' }        │
  │    → useOptimistic rolls back automatically │
  │    → action disappears from UI              │
  │    → reason shown as inline error           │
  └─────────────────────────────────────────────┘

  Per-item status rendering:
    pending  → opacity 0.5, "(validating...)"
    accepted → full opacity
    modified → orange tint, "(modified by AI)"
    rejected → red, "✗ reason text" (then rolls back)
```

---

### 4. Streaming Text Rendering — Batched State Updates

Updating React state on every single token (50-100 times/second) causes
excessive re-renders. The fix: buffer tokens in a ref, flush to state at ~50ms:

```
  SSE chunk arrives (e.g., 10x per second)
          │
          ▼
  bufferRef.current += token     ← no re-render (ref mutation)

  setInterval every 50ms:
          │
          ▼
  setDisplayedText(prev => prev + bufferRef.current)  ← re-render
  bufferRef.current = ''

  Result: UI re-renders ~20x/second (smooth) instead of 100x/second (janky)
```

Scroll-to-bottom wiring:

```
  message list div
  ┌──────────────────────────────┐
  │ "The door creaks open..."    │
  │ "Beyond it lies a dark..."   │  ← new content appended here
  │ "The torches flicker as..."  │
  │                              │
  │ <div ref={bottomRef} />      │  ← empty anchor div at end
  └──────────────────────────────┘

  useEffect([messages]) → bottomRef.current.scrollIntoView({ behavior: 'instant' })

  CSS requirement — without min-height: 0, overflow-y: auto silently breaks:
  .message-list {
    flex: 1;
    min-height: 0;    ← CRITICAL: flex children default to min-height: auto
    overflow-y: auto;
  }
```

---

### 5. Full Frontend Architecture

```
  app/narrative/page.tsx   (Server Component)
  │
  └── <NarrativePage />    (Client Component — 'use client')
       │
       ├── useStream()                hook: fetch SSE, parse events, dispatch
       │    ├── fetch POST /generate/stream
       │    ├── ReadableStream reader loop
       │    ├── SSE buffer-split parser
       │    └── AbortController (cleanup on unmount)
       │
       ├── useNarrativeHistory()      hook: append beats, track chosen actions
       │    └── [{ narrative, chosenAction, choices }]
       │
       ├── useOptimistic()            hook: show action before server confirms
       │    └── auto-rollback on rejected
       │
       ├── <NarrativePanel />         scrollable history + live streaming text
       │    ├── past beats (greyed)
       │    ├── active beat (streaming)
       │    └── <div ref={bottomRef} />  (scroll anchor)
       │
       ├── <ChoiceButtons />           3 dynamic choices from SSE 'choices' event
       │    └── click → submit as next action
       │
       └── <ActionInput />            free-text input
            ├── submit → trigger SSE stream
            └── show validation feedback inline
```

---

### 6. SSE Event Handling State Machine

```
  ┌─────────┐   action submitted   ┌──────────┐
  │  idle   │ ────────────────────►│ waiting  │
  │ choices │                      │ (typing  │
  │ shown   │                      │ dots)    │
  └─────────┘                      └────┬─────┘
       ▲                                │ { type: 'start' }
       │                                ▼
       │                          ┌──────────┐
       │   { type: 'choices' }    │streaming │
       └──────────────────────────│ (text    │
                                  │ chunks)  │
                                  └────┬─────┘
                                       │ { type: 'done' }
                                       ▼
                                  ┌──────────┐
                                  │  done    │── { type: 'error' } ──► error state
                                  │ (await   │                          (retry btn)
                                  │ choices) │
                                  └──────────┘

  Special events (before 'start'):
    { type: 'rejected' } → rollback optimistic, show reason, back to idle
    { type: 'modified' } → swap optimistic text, then continue to 'waiting'
```

---

## Key Files

| File | What it does |
|---|---|
| `client/src/app/narrative/page.tsx` | Next.js route — narrative game page |
| `client/src/hooks/useStream.ts` | fetch SSE, parse events, dispatch to UI |
| `client/src/hooks/useNarrativeHistory.ts` | Append beats, track chosen actions |
| `client/src/components/NarrativePanel.tsx` | Scrollable text display with auto-scroll |
| `client/src/components/ChoiceButtons.tsx` | Dynamic choice buttons |
| `client/src/components/ActionInput.tsx` | Free-text input with optimistic feedback |
| `docs/notes/day-6/nextjs-app-router.md` | Next.js App Router deep-dive |
| `docs/notes/day-6/sse-client.md` | fetch + ReadableStream SSE consumption |
| `docs/notes/day-6/optimistic-ui.md` | useOptimistic / useActionState patterns |
| `docs/notes/day-6/scroll-and-streaming-text.md` | Scroll-to-bottom + batched renders |
