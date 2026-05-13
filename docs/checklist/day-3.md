# Day 3 Checklist — Streaming Responses + Progressive Narrative Reveal

**Project focus:** AI Chat Assistant (real-time streaming) + Progressive Gen (stream narrative as it generates)

---

## 1. Core Learning

- [ ] Understand Server-Sent Events (SSE) — protocol, event format, browser vs curl behavior
- [ ] Understand OpenAI streaming — `stream: true`, async iterables, chunk shape (`choices[0].delta.content`)
- [ ] Understand NestJS SSE — `@Sse()` decorator, `Observable<MessageEvent>`, `EventSource` protocol
- [ ] Understand streaming error handling — mid-stream errors, connection drops, cleanup

---

## 2. Streaming Endpoint

- [ ] Add a `POST /api/generate/stream` SSE endpoint to `GenerateController`
- [ ] Modify `NarrativeGeneratorService` to expose a `stream(prompt)` method using `stream: true`
- [ ] Return narrative chunks progressively as SSE `data` events (`{ type: 'chunk', content: '...' }`)
- [ ] Signal narrative completion with a sentinel event (`{ type: 'done' }`)
- [ ] Send choices array in the final event after narrative completes (`{ type: 'choices', choices: [...] }`)

---

## 3. Stream Lifecycle

- [ ] Handle mid-stream OpenAI errors — catch errors from the async iterable and emit an error event
- [ ] Clean up the OpenAI stream on client disconnect (abort controller or stream destroy)
- [ ] Add a typing-indicator event at stream start (`{ type: 'start' }`) before first chunk arrives

---

## 4. Integration & Testing

- [ ] Verify streaming endpoint with `curl -N` (no-buffering) from the terminal
- [ ] Verify chunk-by-chunk delivery — narrative text arrives progressively, choices arrive last
- [ ] Verify clean disconnect — no resource leaks when client disconnects mid-stream
- [ ] Ensure non-streaming `POST /api/generate` still works after changes

---

## 5. Success Criteria

- [ ] NestJS `@Sse()` endpoint implemented and reachable
- [ ] OpenAI responses streamed chunk by chunk via SSE
- [ ] `{ type: 'start' }` event emitted before first chunk
- [ ] `{ type: 'chunk', content }` events emitted for each narrative token
- [ ] `{ type: 'choices', choices }` event emitted after narrative completes
- [ ] Mid-stream errors handled gracefully with `{ type: 'error', message }` event
- [ ] Client disconnect cleans up the stream without server errors
- [ ] Streaming endpoint verified working from curl
