# Tokens and Cost Management

## What Is a Token?

Tokens are the units that language models read and write. They are not words — they are subword fragments determined by the model's tokenizer.

**Rough approximations:**
- 1 token ≈ 4 characters in English
- 1 token ≈ 0.75 words
- 100 tokens ≈ 75 words
- 1,000 tokens ≈ 750 words (about 1.5 pages)

**Examples:**
- `"hello"` → 1 token
- `"ChatGPT"` → 2 tokens (`Chat`, `GPT`)
- `"unbelievable"` → 3 tokens (`un`, `believ`, `able`)
- A typical paragraph ≈ 50–100 tokens

Tokens span both your **input** (prompt + conversation history) and your **output** (the model's reply). You are billed for both.

---

## How Tokenization Works

OpenAI models use **cl100k_base** (GPT-4/GPT-3.5) or **o200k_base** (GPT-4o) tokenizers. These use Byte-Pair Encoding (BPE) — common words/fragments become single tokens, rare fragments are split.

**The tokenizer is deterministic** — the same input always produces the same tokens.

---

## Counting Tokens with `tiktoken`

`tiktoken` is the official OpenAI tokenizer library.

### Install

```bash
npm install tiktoken
# or
pip install tiktoken
```

### TypeScript — Count tokens before sending

```typescript
import { encoding_for_model, get_encoding } from "tiktoken";

function countTokens(text: string, model: string = "gpt-4o"): number {
  // gpt-4o uses o200k_base; gpt-4/gpt-3.5 use cl100k_base
  const enc = encoding_for_model(model as any);
  const tokens = enc.encode(text);
  enc.free(); // free memory
  return tokens.length;
}

// Usage
const prompt = "Write a short story about a lighthouse keeper.";
console.log(countTokens(prompt, "gpt-4o-mini")); // ~10 tokens
```

### Count tokens for a full messages array

```typescript
import { encoding_for_model } from "tiktoken";

type Message = { role: string; content: string };

function countMessagesTokens(messages: Message[], model: string = "gpt-4o"): number {
  const enc = encoding_for_model(model as any);

  let total = 0;
  for (const msg of messages) {
    total += 4; // overhead per message (role + framing tokens)
    total += enc.encode(msg.content).length;
  }
  total += 2; // reply priming tokens

  enc.free();
  return total;
}
```

---

## Model Pricing (as of 2025)

Pricing is per **1 million tokens** (input / output billed separately).

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|---|---|---|
| `gpt-4o` | $2.50 | $10.00 |
| `gpt-4o-mini` | $0.15 | $0.60 |
| `gpt-4-turbo` | $10.00 | $30.00 |
| `gpt-3.5-turbo` | $0.50 | $1.50 |

**Note:** Prices change — always check [platform.openai.com/docs/pricing](https://platform.openai.com/docs/pricing) for current rates.

---

## Estimating Request Cost

```typescript
interface ModelPricing {
  inputPer1M: number;   // USD per 1M input tokens
  outputPer1M: number;  // USD per 1M output tokens
}

const PRICING: Record<string, ModelPricing> = {
  "gpt-4o":       { inputPer1M: 2.50,  outputPer1M: 10.00 },
  "gpt-4o-mini":  { inputPer1M: 0.15,  outputPer1M: 0.60  },
  "gpt-4-turbo":  { inputPer1M: 10.00, outputPer1M: 30.00 },
};

function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = PRICING[model];
  if (!pricing) throw new Error(`Unknown model: ${model}`);

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;

  return inputCost + outputCost;
}

// Example: 500 input tokens, 200 output tokens on gpt-4o-mini
const cost = estimateCost(500, 200, "gpt-4o-mini");
console.log(`Estimated cost: $${cost.toFixed(6)}`);
// → $0.000195
```

---

## Reading Usage from the API Response

Every Chat Completions response includes a `usage` object with exact token counts — use this for accurate tracking rather than estimates.

```typescript
import OpenAI from "openai";

const client = new OpenAI();

async function callWithUsageTracking(prompt: string) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
  });

  const usage = response.usage!;
  console.log("Prompt tokens:     ", usage.prompt_tokens);
  console.log("Completion tokens: ", usage.completion_tokens);
  console.log("Total tokens:      ", usage.total_tokens);

  const cost = estimateCost(
    usage.prompt_tokens,
    usage.completion_tokens,
    "gpt-4o-mini"
  );
  console.log(`Actual cost:       $${cost.toFixed(6)}`);

  return response.choices[0].message.content;
}
```

---

## Cumulative Cost Tracking Across Multiple Calls

```typescript
interface UsageAccumulator {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  callCount: number;
}

const usageLog: UsageAccumulator = {
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  callCount: 0,
};

function trackUsage(usage: OpenAI.CompletionUsage): void {
  usageLog.totalPromptTokens += usage.prompt_tokens;
  usageLog.totalCompletionTokens += usage.completion_tokens;
  usageLog.callCount += 1;
}

function printCostSummary(model: string): void {
  const cost = estimateCost(
    usageLog.totalPromptTokens,
    usageLog.totalCompletionTokens,
    model
  );
  console.log(`\n--- Usage Summary ---`);
  console.log(`API calls:          ${usageLog.callCount}`);
  console.log(`Total input tokens: ${usageLog.totalPromptTokens}`);
  console.log(`Total output tokens:${usageLog.totalCompletionTokens}`);
  console.log(`Estimated total cost: $${cost.toFixed(4)}`);
}
```

---

## Cost Reduction Strategies

- **Use `gpt-4o-mini` by default** — it's ~17x cheaper than `gpt-4o` for input tokens; reserve `gpt-4o` for tasks that need it
- **Set `max_tokens` explicitly** — prevents runaway output on open-ended prompts
- **Keep system prompts lean** — the system prompt repeats on every call; trim it ruthlessly
- **Avoid unnecessary history** — only include conversation turns the model actually needs
- **Summarize long contexts** — instead of passing 20 turns of history, summarize them first
- **Cache repeated inputs** — if the same prompt is sent repeatedly, cache the response
- **Use `tiktoken` before sending** — pre-check token count and warn/reject if it exceeds your budget

---

## Token Limits by Model

| Model | Context Window (max input + output) |
|---|---|
| `gpt-4o` | 128,000 tokens |
| `gpt-4o-mini` | 128,000 tokens |
| `gpt-4-turbo` | 128,000 tokens |
| `gpt-3.5-turbo` | 16,385 tokens |

If your messages array exceeds the context window, the API returns a `400` error. Always count tokens before sending large contexts.
