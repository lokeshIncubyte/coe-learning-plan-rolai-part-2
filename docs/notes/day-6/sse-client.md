# SSE Client Consumption

## EventSource API

```js
const es = new EventSource(url, { withCredentials: false })
```

Only two constructor options: `url` and `withCredentials`.

**Properties (read-only):** `readyState` (0=CONNECTING, 1=OPEN, 2=CLOSED), `url`, `withCredentials`.

**Event handlers:**
- `onopen` — connection established
- `onmessage` — fires for frames with no `event:` field, or `event: message`. `event.data` is the raw string after `data: `.
- `onerror` — fires on failure. Browser retries automatically unless `readyState === CLOSED`. Check `readyState` inside the handler to detect permanent close.
- Named events: `es.addEventListener('chunk', handler)` — fires only for `event: chunk` frames.

**`close()`:** Sets `readyState` to CLOSED, terminates connection. Browser will NOT reconnect. Safe to call on already-closed connection.

**Hard limitations:**
- GET only — no method, body, or custom headers
- Auth must ride the URL query string or a cookie (`withCredentials: true`)
- 6-connection-per-domain limit (without HTTP/2)
- Browser-only — not available in Node.js/Bun without polyfill
- Reconnect delay controlled by server `retry:` field; cannot be disabled without calling `close()`

**When to use:** Simple GET endpoints, no auth header, no request body.

---

## `fetch` with ReadableStream

```js
const response = await fetch(url, { method: 'POST', headers: {...}, body: JSON.stringify(payload), signal })
const reader = response.body.getReader()
const decoder = new TextDecoder()  // create once, reuse across chunks

try {
  while (true) {
    const { done, value } = await reader.read()  // value is Uint8Array
    if (done) break
    const text = decoder.decode(value, { stream: true })
    // process text
  }
} finally {
  reader.releaseLock()
}
// Flush final bytes after loop:
decoder.decode()
```

**Key facts:**
- `response.body` is `ReadableStream<Uint8Array>`
- `getReader()` locks the stream — no second reader until `releaseLock()`
- `TextDecoder` must be created **once** and reused — pass `{ stream: true }` so multi-byte UTF-8 sequences split across chunk boundaries are buffered internally
- Alternative: `response.body.pipeThrough(new TextDecoderStream()).getReader()` — produces `ReadableStreamDefaultReader<string>` directly
- `for await (const chunk of response.body)` — cleaner syntax but **not supported in Safari ≤ 18.x**; use `getReader()` loop for production

---

## Parsing SSE Format from a Fetch Stream

**Wire format:**
```
data: {"token":"Hello"}\n\n
event: done\ndata: \n\n
id: 42\ndata: {"token":"World"}\n\n
```

**Rules:** every field ends with `\n`; events separated by `\n\n`; lines starting with `:` are comments (ignore); `[DONE]` is an OpenAI convention (not spec) — check before JSON-parsing.

**Buffer-split pattern (mandatory):**

```js
let buffer = ''

// inside the read loop:
buffer += decoder.decode(value, { stream: true })
const parts = buffer.split('\n\n')
buffer = parts.pop() ?? ''  // hold incomplete last segment

for (const part of parts) {
  for (const line of part.split('\n')) {
    if (line.startsWith('data: ')) {
      const raw = line.slice(6)
      if (raw === '[DONE]') continue
      try {
        const parsed = JSON.parse(raw)
        // handle parsed event
      } catch { /* malformed — log and continue */ }
    }
    // handle event:, id:, retry: as needed
  }
}
```

**Critical gotcha:** Network chunks do NOT align with SSE event boundaries. A single chunk may contain multiple events, or one event may span multiple chunks. The buffer-then-split strategy is **mandatory** — never assume one `reader.read()` = one SSE event.

**NestJS-specific:** `@Sse()` + RxJS Observable sends `event: <name>\ndata: <payload>\n\n`. Handle the `event:` line in your parser.

---

## EventSource vs fetch — Decision Table

| Requirement | EventSource | fetch + ReadableStream |
|---|---|---|
| HTTP method | GET only | Any (POST for JSON prompts) |
| Custom headers (`Authorization`) | No | Yes |
| Request body (JSON prompt) | No | Yes |
| Auto-reconnect | Yes (built-in) | Manual |
| Named event routing | Yes (`addEventListener`) | Manual parsing |
| Node.js / server-side | No (needs polyfill) | Yes |

**Rule for NestJS SSE endpoint with POST + JSON body:** always use `fetch`. `EventSource` cannot POST or set `Authorization`.

For auto-retry + custom headers: `@microsoft/fetch-event-source` wraps fetch with reconnect logic.

---

## AbortController — Cancelling a Fetch Stream

```js
const controller = new AbortController()

const response = await fetch(url, {
  method: 'POST',
  signal: controller.signal,
  body: JSON.stringify(payload)
})

// To cancel:
controller.abort()
```

**Key facts:**
- Single-use — once aborted cannot be reset. Create a new instance per request.
- When aborted, `reader.read()` rejects with `DOMException` whose `name === 'AbortError'`. Always guard:
  ```js
  catch (err) {
    if (err.name === 'AbortError') return  // expected on unmount
    throw err                              // real error
  }
  ```
- `AbortSignal.timeout(ms)` — one-shot signal that auto-fires after `ms`.
- `AbortSignal.any([sig1, sig2])` — fires when any combined signal fires.

---

## React Pattern for Consuming a Stream

```ts
useEffect(() => {
  const controller = new AbortController()
  let active = true

  async function stream() {
    try {
      const res = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            for (const line of part.split('\n')) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6)
              if (raw === '[DONE]') break
              try {
                const { token } = JSON.parse(raw)
                if (active) setText(prev => prev + token)  // functional update — avoids stale closure
              } catch {}
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err)
    }
  }

  stream()
  return () => { active = false; controller.abort() }
}, [prompt])
```

**Stale closure fix:** use `setText(prev => prev + token)`, never `setText(text + token)` — inside the read loop, the captured `text` is a snapshot from render time.

**`useRef` for controller (cancel from outside effect):**
```ts
const controllerRef = useRef<AbortController | null>(null)
// In useEffect: controllerRef.current = controller
// In stop button: controllerRef.current?.abort()
```

**React Strict Mode double-invoke:** intentional in development. The `active = false` + `controller.abort()` cleanup in the first unmount handles it correctly; second mount creates a fresh controller.

---

## Gotchas Summary

| Gotcha | Fix |
|---|---|
| Next.js buffers SSE | `Cache-Control: no-cache, no-transform` + `X-Accel-Buffering: no` + `export const dynamic = 'force-dynamic'` |
| Nginx buffering | `X-Accel-Buffering: no` response header |
| Multi-byte UTF-8 split | `new TextDecoder()` once + `decode(chunk, { stream: true })` |
| SSE event split across chunks | Buffer + split on `\n\n`, keep trailing incomplete segment |
| Stale closure in loop | Functional setter: `setState(prev => ...)` |
| Zombie connections after unmount | `active` flag + `controller.abort()` in cleanup |
| `AbortError` masking real errors | `if (err.name !== 'AbortError')` guard |
| `reader` not released on error | `try/finally { reader.releaseLock() }` |
| `for await...of response.body` | Fails on Safari ≤ 18 — use `getReader()` loop |
| EventSource auth | Cannot set `Authorization` header — use `fetch` instead |
