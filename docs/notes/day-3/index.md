# Day 3 — Streaming Responses + Progressive Narrative Reveal

## New Technologies & Patterns

### 1. OpenAI Streaming — `stream: true`

Without streaming, the API waits for the full completion before responding.
With `stream: true`, it returns an **async iterable** of partial chunks:

```
Without streaming:
  Client ──────────────────────────────────────► OpenAI
         ◄──── (3-10s silence) ─── full text ───

With streaming:
  Client ──────────────────────────────────────► OpenAI
         ◄── "The" ── " sun" ── " rose" ── ...──  (token by token)
```

Each chunk has this shape:

```
ChatCompletionChunk {
  choices: [{
    delta: {
      content: "The"   ← token text (null on final chunk)
    },
    finish_reason: null  ← "stop" on last chunk
  }]
}

Token text: chunk.choices[0]?.delta?.content ?? ''
```

---

### 2. Server-Sent Events (SSE) — Wire Protocol

SSE is a plain-HTTP server-push protocol. The server keeps the connection open
and writes newline-delimited text frames. The client reads them as they arrive.

```
HTTP Response (Content-Type: text/event-stream)
│
│  data: {"type":"start"}\n\n
│
│  data: {"type":"chunk","content":"The"}\n\n
│
│  data: {"type":"chunk","content":" sun"}\n\n
│
│  data: {"type":"chunk","content":" rose"}\n\n
│        ...
│  data: {"type":"done"}\n\n
│
│  data: {"type":"choices","choices":[...]}\n\n
│
└── (connection closes)

Each event = one or more "field: value\n" lines + blank line "\n\n"
```

SSE vs alternatives:

```
               SSE           WebSockets    Long Polling
Direction      server→client bidirectional server→client
Protocol       HTTP          custom TCP    HTTP
Auto-reconnect yes           no            manual
Best for       token streams chat          simple updates
```

---

### 3. NestJS `@Sse()` — Observable Wrapping

NestJS bridges OpenAI's async iterable to SSE via RxJS:

```
OpenAI SDK
  stream: true
  ──────────────────────────────────────────────
  returns Stream<ChatCompletionChunk>
  (implements AsyncIterable)
          │
          │  RxJS from() accepts AsyncIterable directly
          ▼
  Observable<string>   (one token per emission)
          │
          │  .pipe(map(token => ({ data: { type:'chunk', content:token } })))
          ▼
  Observable<MessageEvent>
          │
          │  returned from @Sse('stream') handler
          ▼
  NestJS serialises each emission as:
    data: {"type":"chunk","content":"The"}\n\n
  and writes to the open HTTP response
```

Client disconnect wiring:

```
  Client disconnects
          │
          ▼
  RxJS unsubscribes from Observable
          │
          ▼  (Observable teardown function)
  AbortController.abort()
          │
          ▼
  OpenAI HTTP request cancelled
  (no dangling connections)
```

---

### 4. Full Streaming Pipeline in This Project

```
  CLIENT                 NestJS (GenerateController)        OpenAI
    │                           │                              │
    │ GET /generate/stream       │                              │
    │ { action: "open door" }    │                              │
    │ ──────────────────────────►│                              │
    │                           │ 1. validate action           │
    │                           │    (ActionValidatorAgent)    │
    │                           │                              │
    │ data:{type:"start"}        │ 2. narrativeGenerator        │
    │ ◄──────────────────────── │    .stream(prompt)           │
    │                           │ ──────────────────────────── ►│
    │ data:{type:"chunk",        │                              │
    │       content:"The door"}  │    chunk stream              │
    │ ◄──────────────────────── │ ◄─────────────────────────── │
    │ data:{type:"chunk",        │                              │
    │       content:" creaks"}   │                              │
    │ ◄──────────────────────── │                              │
    │          ...               │          ...                 │
    │                           │                              │
    │ data:{type:"done"}         │ 3. narrative complete        │
    │ ◄──────────────────────── │                              │
    │                           │ 4. generateChoices()         │
    │ data:{type:"choices",      │    (ChoiceGeneratorAgent)    │
    │       choices:[...]}       │                              │
    │ ◄──────────────────────── │                              │
```

---

### 5. Event Lifecycle State Machine

```
  ┌─────────┐  stream starts   ┌──────────┐  first token  ┌────────────┐
  │  idle   │ ────────────────►│ waiting  │ ─────────────►│ streaming  │
  └─────────┘                  │ (start   │               │ (chunk     │
                               │  event)  │               │  events)   │
                               └──────────┘               └─────┬──────┘
                                                                 │ finish_reason='stop'
                                                                 ▼
                                                          ┌────────────┐
                                      error event ───────►│    done    │◄─── rejected
                                                          └────────────┘
```

---

## Key Files

| File | What it does |
|---|---|
| `server/src/generate/generate.controller.ts` | `@Sse('stream')` handler, wraps OpenAI stream in Observable |
| `server/src/narrative/narrative-generator.service.ts` | `stream(prompt)` — opens OpenAI streaming request |
| `docs/notes/day-3/sse.md` | SSE wire protocol reference |
| `docs/notes/day-3/nestjs-sse.md` | NestJS `@Sse()` patterns and cleanup |
| `docs/notes/day-3/openai-streaming.md` | OpenAI SDK streaming API reference |
