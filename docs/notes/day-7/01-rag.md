# RAG — Retrieval Augmented Generation

## What it is

RAG is the pattern of fetching relevant knowledge from an external store at query time and injecting it into the LLM prompt — rather than relying solely on what the model learned during training.

```
User prompt
    │
    ▼
Embed prompt ──► Vector search ──► Top-K relevant chunks
                                         │
                                         ▼
                              Augmented prompt → LLM → Response
```

## Why static dumps fail

Dumping every entity into every prompt has three problems:

| Problem | Effect |
|---|---|
| Token cost | Large context = expensive + slow |
| Noise | Irrelevant entities dilute relevant signal |
| Context window | Eventually exceeds model limits |

RAG solves all three by selecting only the entities semantically close to the current query.

## Two phases

**Retrieval** — Convert the query to a vector. Find the K nearest vectors in the store. Return those documents/entities.

**Augmentation** — Prepend retrieved content to the prompt as context. The LLM answers using both its weights and the injected knowledge.

## In this project

The player's action prompt is the query. The entity graph is the knowledge store. Instead of dumping all 50+ entities, the pipeline fetches the 5–10 most relevant ones and injects only those into the narrative generation prompt.
