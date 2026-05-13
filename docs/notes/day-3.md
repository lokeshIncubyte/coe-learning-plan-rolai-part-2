# Day 3 Research Notes — Streaming Responses

---

## 1. Server-Sent Events (SSE)

### What it is
SSE is an HTTP-based protocol for **unidirectional server-to-client streaming**. The server holds a long-lived HTTP response open and pushes text events incrementally. The client cannot send data over the same connection.

| | SSE | WebSockets | Long Polling |
|---|---|---|---|
| Direction | Server → Client only | Bidirectional | Server → Client (per request) |
| Protocol | Plain HTTP | Custom framing over TCP | Plain HTTP |
| Auto-reconnect | Yes (built-in) | No | Manual |
| Use when | Server pushes, client reads | Client also sends frequently | Simple, infrequent updates |

### Wire Format
The response body is UTF-8 text. Each event is `field: value` lines terminated by **a blank line** (`\n\n`).

```
: this is a comment (ignored)

data: Hello, world\n\n

event: update
data: {"temperature": 72}
id: 42
retry: 5000\n\n

data: line one
data: line two\n\n
```

| Field | Purpose |
|---|---|
| `data:` | Payload. Multiple lines joined with `\n`. Required. |
| `event:` | Named event type. Omit for default `message`. |
| `id:` | Last-event-ID. Sent back on reconnect as `Last-Event-ID` header. |
| `retry:` | Reconnect delay in ms. |

### Required HTTP Headers
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Browser `EventSource` API
```js
const es = new EventSource('/stream');

es.onmessage = (event) => console.log(event.data);          // default "message" events
es.addEventListener('update', (event) => { ... });           // named events
es.onerror = () => console.log('state:', es.readyState);     // 0=CONNECTING, 1=OPEN, 2=CLOSED
es.close();                                                  // stop and disable auto-reconnect
```

**Reconnect:** On disconnect, browser auto-reconnects after `retry` ms (default ~3000ms), sending `Last-Event-ID` so the server can resume. Call `es.close()` to prevent it.

**Named events vs `message`:** `onmessage` only fires for events with no `event:` field. Named events require `addEventListener('eventName', ...)`.

### Testing with curl
```bash
curl -N http://localhost:3000/api/generate/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```
`-N` disables output buffering — without it you see nothing until the connection closes.

### Limitations
- Unidirectional (server → client only)
- HTTP/1.1: ~6 connections per domain limit (not an issue with HTTP/2)
- Text only — binary must be base64-encoded
- No delivery guarantees beyond `Last-Event-ID` resume

---

## 2. OpenAI Streaming (Node.js SDK v6+)

### Enabling Streaming
```ts
const stream = await openai.chat.completions.create({
  model: 'openai/gpt-4o-mini',
  messages: [...],
  stream: true,
});
```
Return type changes from `ChatCompletion` to `Stream<ChatCompletionChunk>`.

### Chunk Shape
```ts
// ChatCompletionChunk
{
  id: 'chatcmpl-...',
  object: 'chat.completion.chunk',
  choices: [{
    index: 0,
    delta: {
      role: 'assistant',  // first chunk only
      content: 'Hello',   // null on final chunk
    },
    finish_reason: null,  // 'stop' | 'length' | 'tool_calls' | null
  }],
  usage: null,            // only populated when stream_options.include_usage: true
}
```
The token text lives in `choices[0].delta.content`. The last real chunk has `content: null` and `finish_reason: 'stop'`.

### Iterating
```ts
for await (const chunk of stream) {
  const token = chunk.choices[0]?.delta?.content ?? '';
  process.stdout.write(token);
}
// Loop exit = stream fully consumed. No explicit cleanup needed.
```

### Higher-Level Runner
```ts
const runner = openai.chat.completions.stream({ model: '...', messages: [...] });

for await (const chunk of runner) { /* live deltas */ }

const full = await runner.finalChatCompletion(); // accumulated full response
```

### Detecting End of Stream
- `finish_reason === 'stop'` on the last chunk
- `for await` loop exiting normally

### Usage Stats
```ts
const stream = await openai.chat.completions.create({
  ...,
  stream: true,
  stream_options: { include_usage: true },
});
// Final extra chunk has choices: [] and usage: { prompt_tokens, completion_tokens, total_tokens }
```

### Aborting
```ts
const controller = new AbortController();
const stream = await openai.chat.completions.create(
  { ..., stream: true },
  { signal: controller.signal },
);
controller.abort(); // throws OpenAI.APIUserAbortError
```
`break` from the loop stops iteration but does NOT cancel the HTTP request — call `controller.abort()` for a hard cancel.

### Error Handling Mid-Stream
```ts
try {
  for await (const chunk of stream) { ... }
} catch (err) {
  if (err instanceof OpenAI.APIError) {
    // network interruption, server error, parse failure
  }
}
```

---

## 3. NestJS SSE

### `@Sse()` Decorator
From `@nestjs/common` — no extra install. Must return `Observable<MessageEvent>`.

```ts
import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';

@Controller('generate')
export class GenerateController {
  @Sse('stream')
  stream(): Observable<MessageEvent> { ... }
}
```

### `MessageEvent` Shape
```ts
interface MessageEvent {
  data: string | object;  // serialised to SSE data: field
  id?: string;
  type?: string;          // maps to SSE event: field
  retry?: number;
}
```
NestJS automatically `JSON.stringify`s object `data`. No manual serialisation needed.

### Wrapping an OpenAI Stream (Async Iterable → Observable)
RxJS `from()` accepts `AsyncIterable` directly (RxJS 7+):

```ts
import { from } from 'rxjs';
import { map } from 'rxjs/operators';

@Sse('stream')
stream(@Body() dto: GenerateRequestDto): Observable<MessageEvent> {
  const asyncGen = async function* () {
    const stream = await openai.chat.completions.create({
      stream: true,
      messages: [{ role: 'user', content: dto.prompt }],
    });
    for await (const chunk of stream) {
      yield chunk.choices[0]?.delta?.content ?? '';
    }
  };

  return from(asyncGen()).pipe(
    map((token) => ({ data: { type: 'chunk', content: token } }))
  );
}
```
When the client disconnects, RxJS calls `.return()` on the async iterator automatically — the OpenAI stream is cleaned up.

### Client Disconnect Detection
**Preferred (platform-agnostic) — RxJS teardown:**
```ts
return new Observable((subscriber) => {
  const ac = new AbortController();
  startStream(ac.signal, (token) => subscriber.next({ data: token }));
  return () => ac.abort(); // called on unsubscribe/disconnect
});
```

**Alternative (Express-specific):**
```ts
@Sse('stream')
stream(@Res() res: Response): Observable<MessageEvent> {
  return new Observable((subscriber) => {
    res.on('close', () => subscriber.complete());
  });
}
```

### Headers
NestJS sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` **automatically**. Nothing to configure.

### Route Coexistence
`@Sse()` routes respond to `GET`. Keep paths distinct from `@Post()` to avoid ambiguity:
```ts
@Post()           // POST /generate
generate() { ... }

@Sse('stream')    // GET  /generate/stream
stream() { ... }
```

### Guards / Interceptors / Filters
All work normally with `@Sse()`. Key caveats:
- **Interceptors**: errors emitted *through* the Observable (via `subscriber.error()`) bypass `ExceptionFilter` — catch them inside the Observable and emit as `{ type: 'error' }` events instead.
- **Guards**: execute once at request time before the stream opens — standard auth guards work unchanged.
- **`@UseFilters(new OpenAiExceptionFilter())`**: catches errors thrown during setup (before streaming starts), but not mid-stream Observable errors.
