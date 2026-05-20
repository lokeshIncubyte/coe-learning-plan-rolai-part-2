# OpenAI Embeddings API — text-embedding-3-small

## Model specs

| Property | Value |
|---|---|
| Model ID | `text-embedding-3-small` |
| Dimensions | 1536 (default); supports 256, 512, 1024 via `dimensions` param |
| Max input tokens | 8191 |
| Pricing | $0.02 / 1M tokens (Standard); $0.01 / 1M tokens (Batch) |
| Input only | No output tokens — only input is charged |

Replaced `text-embedding-ada-002` in early 2024. Supported by every major vector DB.

## Basic usage (Node.js SDK)

```ts
import OpenAI from 'openai';

const openai = new OpenAI();

const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'The knight charges toward the castle gate',
  // dimensions: 512,  // optional — reduces size with minimal quality loss
});

const vector: number[] = response.data[0].embedding; // 1536 floats
```

## Batching

Pass an array to `input` to embed multiple texts in one request — cheaper and faster than one call per entity:

```ts
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: ['Entity A text', 'Entity B text', 'Entity C text'],
});
// response.data[0].embedding, response.data[1].embedding, ...
```

## What to embed per entity

Concatenate the most descriptive fields so the embedding captures the entity's full meaning:

```ts
const text = `${entity.name}. ${JSON.stringify(entity.facts)}`;
```

Avoid embedding raw JSON keys — natural language descriptions produce better embeddings.

## Matryoshka truncation

`text-embedding-3-small` supports shortening the output vector without re-embedding:

```ts
{ model: 'text-embedding-3-small', input: text, dimensions: 512 }
```

Useful if storage or query speed is a concern. For this project's scale (dozens of entities), 1536 dims is fine.
