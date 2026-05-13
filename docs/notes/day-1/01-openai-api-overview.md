# OpenAI API Overview

## What Is the OpenAI API?

The OpenAI API gives you programmatic access to OpenAI's language models (GPT-4o, GPT-4o-mini, etc.). You send a request with a conversation and receive a generated response. It is a REST API — you can use it from any language via HTTP or through the official SDKs.

**Key facts:**
- Stateless: each request must include the full conversation history
- Billed per token (input + output)
- Models available: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`, and others
- Primary endpoint for text generation: **Chat Completions**

---

## Authentication

All requests require an API key passed as a Bearer token in the `Authorization` header.

**Getting your key:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys → Create new secret key
3. Copy and store it securely — it is only shown once

**Best practices:**
- Store the key in an environment variable (`OPENAI_API_KEY`), never hardcode it
- Use `.env` files locally and secret managers in production
- Rotate keys if leaked

```bash
# .env file
OPENAI_API_KEY=sk-proj-...
```

---

## Base URL

```
https://api.openai.com/v1
```

All endpoints are relative to this base. Example:

```
POST https://api.openai.com/v1/chat/completions
```

---

## The Chat Completions Endpoint

`POST /v1/chat/completions`

This is the main endpoint for generating text. You send a list of messages and get a completion back.

---

## First API Call — curl

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      { "role": "user", "content": "Say hello in one sentence." }
    ]
  }'
```

**Example response:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! It's great to meet you today."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 14,
    "completion_tokens": 10,
    "total_tokens": 24
  }
}
```

---

## First API Call — TypeScript

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // reads from env automatically if not passed
});

async function main() {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: "Say hello in one sentence." }
    ],
  });

  console.log(response.choices[0].message.content);
  // Output: "Hello! It's great to meet you today."
}

main();
```

**Install the SDK:**
```bash
npm install openai
```

**Run with ts-node:**
```bash
npx ts-node index.ts
```

---

## Key Response Fields

| Field | Description |
|---|---|
| `choices[0].message.content` | The generated text |
| `choices[0].finish_reason` | Why generation stopped (`stop`, `length`, `content_filter`) |
| `usage.prompt_tokens` | Tokens consumed by your input |
| `usage.completion_tokens` | Tokens in the response |
| `usage.total_tokens` | Total billed tokens |

---

## Quick Reference

- **Docs:** https://platform.openai.com/docs
- **API Reference:** https://platform.openai.com/docs/api-reference/chat
- **Playground:** https://platform.openai.com/playground (test calls visually)
- **Usage dashboard:** https://platform.openai.com/usage
