# OpenAI Streaming — Node.js SDK v6+

## Enabling Streaming

```ts
const stream = await openai.chat.completions.create({
  model: 'openai/gpt-4o-mini',
  messages: [...],
  stream: true,
});
// Returns Stream<ChatCompletionChunk> instead of ChatCompletion
```

---

## Chunk Shape

```ts
// ChatCompletionChunk
{
  choices: [{
    delta: {
      role: 'assistant',  // first chunk only
      content: 'Hello',   // null on final chunk
    },
    finish_reason: null,  // 'stop' | 'length' | 'tool_calls' | null
  }],
  usage: null,            // only when stream_options.include_usage: true
}
```

Token text is in `choices[0].delta.content`. Last chunk has `content: null` and `finish_reason: 'stop'`.

---

## Iterating

```ts
for await (const chunk of stream) {
  const token = chunk.choices[0]?.delta?.content ?? '';
  process.stdout.write(token);
}
// Loop exit = stream fully consumed. No explicit cleanup needed.
```

---

## Higher-Level Runner

```ts
const runner = openai.chat.completions.stream({ model: '...', messages: [...] });

for await (const chunk of runner) { /* live deltas */ }

const full = await runner.finalChatCompletion(); // full accumulated response
```

---

## Detecting End of Stream

- `finish_reason === 'stop'` on the last chunk
- `for await` loop exiting normally

---

## Usage Stats

```ts
const stream = await openai.chat.completions.create({
  ...,
  stream: true,
  stream_options: { include_usage: true },
});
// Extra final chunk: choices: [], usage: { prompt_tokens, completion_tokens, total_tokens }
```

---

## Aborting

```ts
const controller = new AbortController();
const stream = await openai.chat.completions.create(
  { ..., stream: true },
  { signal: controller.signal },
);
controller.abort(); // throws OpenAI.APIUserAbortError
```

> `break` from the loop stops iteration but does NOT cancel the HTTP request. Call `controller.abort()` for a hard cancel.

---

## Error Handling Mid-Stream

```ts
try {
  for await (const chunk of stream) { ... }
} catch (err) {
  if (err instanceof OpenAI.APIError) {
    // network interruption, server error, parse failure
  }
}
```
