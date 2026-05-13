# NestJS SSE

## `@Sse()` Decorator

From `@nestjs/common` — no extra install. Method must return `Observable<MessageEvent>`.

```ts
import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';

@Controller('generate')
export class GenerateController {
  @Sse('stream')   // GET /generate/stream
  stream(): Observable<MessageEvent> { ... }
}
```

---

## `MessageEvent` Shape

```ts
interface MessageEvent {
  data: string | object;  // auto JSON.stringify'd if object
  id?: string;            // SSE id: field
  type?: string;          // SSE event: field
  retry?: number;         // SSE retry: field (ms)
}
```

---

## Wrapping OpenAI Async Iterable → Observable

RxJS `from()` accepts `AsyncIterable` directly (RxJS 7+). Teardown is automatic on disconnect.

```ts
import { from } from 'rxjs';
import { map } from 'rxjs/operators';

@Sse('stream')
stream(@Body() dto: GenerateRequestDto): Observable<MessageEvent> {
  const gen = async function* () {
    const stream = await openai.chat.completions.create({
      stream: true,
      messages: [{ role: 'user', content: dto.prompt }],
    });
    for await (const chunk of stream) {
      yield chunk.choices[0]?.delta?.content ?? '';
    }
  };

  return from(gen()).pipe(
    map((token) => ({ data: { type: 'chunk', content: token } }))
  );
}
```

---

## Client Disconnect — Cleanup

**Preferred (platform-agnostic) — RxJS teardown:**

```ts
return new Observable((subscriber) => {
  const ac = new AbortController();
  startStream(ac.signal, (token) => subscriber.next({ data: token }));
  return () => ac.abort(); // called automatically on unsubscribe/disconnect
});
```

**Alternative (Express-specific):**

```ts
@Sse('stream')
stream(@Res() res: Response): Observable<MessageEvent> {
  return new Observable((subscriber) => {
    res.on('close', () => subscriber.complete());
    // emit events...
  });
}
```

---

## HTTP Headers

NestJS sets these **automatically** — nothing to configure:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

---

## Route Coexistence with `@Post()`

`@Sse()` routes respond to `GET`. Keep paths distinct:

```ts
@Post()          // POST /generate
generate() { }

@Sse('stream')   // GET  /generate/stream
stream() { }
```

---

## Guards / Interceptors / Filters

All work normally. Key caveats:

- **`@UseFilters`**: catches errors thrown *before* streaming starts (setup errors). Errors emitted *through* the Observable (via `subscriber.error()`) bypass filters — catch them inside the Observable and emit as `{ type: 'error' }` events instead.
- **`@UseGuards`**: execute once at request time before the stream opens — standard auth guards work unchanged.
- **`@UseInterceptors`**: use `tap()` inside the interceptor for safe side effects on the stream.
