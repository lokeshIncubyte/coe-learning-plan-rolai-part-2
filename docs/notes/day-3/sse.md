# Server-Sent Events (SSE)

## What it is
Unidirectional server-to-client HTTP streaming. Server holds a long-lived response open and pushes text events. Client cannot send data over the same connection.

| | SSE | WebSockets | Long Polling |
|---|---|---|---|
| Direction | Server → Client | Bidirectional | Server → Client |
| Protocol | Plain HTTP | Custom TCP framing | Plain HTTP |
| Auto-reconnect | Yes (built-in) | No | Manual |
| Use when | Server pushes, client reads | Client also sends frequently | Simple, infrequent updates |

---

## Wire Format

UTF-8 text stream. Each event is `field: value` lines terminated by a **blank line** (`\n\n`).

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
| `id:` | Sent back as `Last-Event-ID` header on reconnect. |
| `retry:` | Reconnect delay in ms. |

---

## Required HTTP Headers

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

---

## Browser `EventSource` API

```js
const es = new EventSource('/stream');

es.onmessage = (event) => console.log(event.data);        // default "message" events only
es.addEventListener('update', (event) => { ... });         // named events
es.onerror = () => console.log('state:', es.readyState);  // 0=CONNECTING, 1=OPEN, 2=CLOSED
es.close();                                                // stop + disable auto-reconnect
```

**Reconnect:** On disconnect, browser auto-reconnects after `retry` ms (default ~3000ms) and sends `Last-Event-ID`. Call `es.close()` to prevent reconnect.

**Named vs default events:** `onmessage` only fires for events with no `event:` field. Named events require `addEventListener('name', ...)`.

---

## curl Testing

```bash
curl -N http://localhost:3000/api/generate/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}'
```

`-N` disables output buffering. Without it, nothing appears until the connection closes.

---

## Limitations

- Unidirectional (server → client only)
- HTTP/1.1: ~6 connections per domain (not an issue over HTTP/2)
- Text only — binary must be base64-encoded
- No delivery guarantees beyond `Last-Event-ID` resume
