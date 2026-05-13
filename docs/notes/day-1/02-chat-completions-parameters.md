# Chat Completions — Request Parameters

## Overview

The `POST /v1/chat/completions` endpoint accepts a JSON body with several parameters that control the model's behavior, output length, and creativity.

---

## Core Parameters

### `model` (required)
The model to use for generation.

```
"gpt-4o"          // Most capable, higher cost
"gpt-4o-mini"     // Faster, cheaper, good for most tasks
"gpt-4-turbo"     // Large context, strong reasoning
"gpt-3.5-turbo"   // Legacy, very cheap
```

---

### `messages` (required)
An array of message objects that form the conversation. Each message has a `role` and `content`.

```typescript
messages: [
  { role: "system",    content: "You are a helpful assistant." },
  { role: "user",      content: "What is 2+2?" },
  { role: "assistant", content: "2+2 equals 4." },
  { role: "user",      content: "Now double that." },
]
```

---

### `temperature`
Controls randomness in the output.

- **Range:** `0.0` to `2.0` (default: `1.0`)
- `0.0` → fully deterministic, always picks the highest-probability token
- `1.0` → balanced, natural-sounding output
- `2.0` → very random, creative but may be incoherent

**Rule of thumb:**
- Use `0.0–0.3` for factual tasks (code, data extraction, Q&A)
- Use `0.7–1.0` for creative writing, brainstorming
- Avoid going above `1.2` unless you specifically want chaos

---

### `max_tokens`
Maximum number of tokens the model can generate in its response.

- Does **not** include the tokens in your input/messages
- Generation stops at `max_tokens` even if the response is incomplete (`finish_reason: "length"`)
- If omitted, the model generates up to its internal limit

```typescript
max_tokens: 500   // Response capped at 500 tokens (~375 words)
```

---

### `top_p`
Nucleus sampling — alternative to `temperature`.

- **Range:** `0.0` to `1.0` (default: `1.0`)
- The model considers only the smallest set of tokens whose cumulative probability exceeds `top_p`
- `top_p: 0.1` → only considers top 10% probability tokens (more focused)
- `top_p: 1.0` → considers all tokens (default, no restriction)

**Note:** OpenAI recommends altering `temperature` OR `top_p`, not both simultaneously.

---

### `frequency_penalty`
Penalizes tokens based on how often they have already appeared in the response.

- **Range:** `-2.0` to `2.0` (default: `0.0`)
- Positive values → reduces repetition of the same words
- Negative values → encourages repetition

```typescript
frequency_penalty: 0.5  // Moderate reduction of word repetition
```

---

### `presence_penalty`
Penalizes tokens based on whether they have appeared at all (not how often).

- **Range:** `-2.0` to `2.0` (default: `0.0`)
- Positive values → encourages the model to introduce new topics/words
- Useful for open-ended creative generation

```typescript
presence_penalty: 0.6  // Encourages topic diversity
```

---

### `stop`
One or more sequences where generation stops (the sequence itself is not included in the output).

```typescript
stop: ["\n", "END"]   // Stop at newline or the word END
stop: "###"           // Can also be a single string
```

---

### `n`
How many completions to generate for each prompt.

```typescript
n: 3  // Returns choices[0], choices[1], choices[2]
```

Note: Costs multiply by `n` (you pay for all generated tokens).

---

### `stream`
If `true`, sends partial tokens as server-sent events (SSE) instead of waiting for the full response.

```typescript
stream: true  // Response streams incrementally
```

---

## Full TypeScript Example

```typescript
import OpenAI from "openai";

const client = new OpenAI();

async function generateCreativeText(prompt: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a creative fiction writer. Write vividly and concisely.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.9,          // High creativity
    max_tokens: 300,           // Limit response length
    top_p: 1.0,                // No nucleus sampling restriction
    frequency_penalty: 0.4,   // Reduce word repetition
    presence_penalty: 0.5,    // Encourage new ideas
    stop: ["THE END"],         // Stop at this phrase if it appears
  });

  return response.choices[0].message.content ?? "";
}

async function main() {
  const text = await generateCreativeText(
    "Write the opening paragraph of a mystery set in 1920s Paris."
  );
  console.log(text);
}

main();
```

---

## Parameter Quick Reference

| Parameter | Type | Default | Effect |
|---|---|---|---|
| `model` | string | — | Which model to use |
| `messages` | array | — | Conversation history |
| `temperature` | float | 1.0 | Randomness (0=deterministic, 2=wild) |
| `max_tokens` | int | model max | Output length cap |
| `top_p` | float | 1.0 | Nucleus sampling threshold |
| `frequency_penalty` | float | 0.0 | Penalize repeated tokens |
| `presence_penalty` | float | 0.0 | Penalize already-used tokens |
| `stop` | string/array | null | Stop sequences |
| `n` | int | 1 | Number of completions |
| `stream` | bool | false | Stream response tokens |
