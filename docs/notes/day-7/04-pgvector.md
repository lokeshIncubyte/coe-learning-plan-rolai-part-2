# pgvector — Vector Search in PostgreSQL

## What it is

pgvector is a PostgreSQL extension that adds a `vector` column type and vector similarity operators. It turns Postgres into a vector database — no separate service needed.

## Setup

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

In Prisma schema (unsupported type — raw SQL for migration):

```prisma
model Entity {
  // ...existing fields...
  embedding Unsupported("vector(1536)")?
}
```

The migration SQL:

```sql
ALTER TABLE "Entity" ADD COLUMN "embedding" vector(1536);
```

## Distance operators

| Operator | Metric | Use when |
|---|---|---|
| `<=>` | Cosine distance | Text embeddings (direction matters, not magnitude) |
| `<->` | L2 (Euclidean) | Image embeddings, spatial data |
| `<#>` | Negative inner product | When vectors are unit-normalized |

For OpenAI embeddings, always use `<=>` (cosine distance).

## Querying similar entities

```sql
SELECT id, name, type,
       embedding <=> $1 AS distance
FROM "Entity"
WHERE embedding IS NOT NULL
ORDER BY embedding <=> $1
LIMIT 10;
```

In Prisma (raw query required — Prisma doesn't understand `vector` type):

```ts
const similar = await prisma.$queryRaw<Entity[]>`
  SELECT id, name, type, tags, facts, state
  FROM "Entity"
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> ${pgvector.toSql(queryEmbedding)}::vector
  LIMIT ${limit}
`;
```

## Index types

### HNSW (recommended)
```sql
CREATE INDEX ON "Entity" USING hnsw (embedding vector_cosine_ops);
```
- Fast queries, better recall
- Slower to build, more memory
- Can be created on an empty table

### IVFFlat (alternative)
```sql
CREATE INDEX ON "Entity" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```
- Faster to build, less memory
- Requires data to exist before indexing (`lists` ≈ `sqrt(row_count)`)
- Lower recall than HNSW at same speed

**For this project**: HNSW — entity count is small (dozens), build time is negligible, and recall matters more than memory.

## Threshold filtering

Cosine distance of 0 = identical, 1 = orthogonal, 2 = opposite. In practice:
- `< 0.3` → very similar
- `0.3–0.6` → related
- `> 0.8` → unrelated

Filter in the query to avoid injecting noise:

```sql
WHERE embedding <=> $1 < 0.6
ORDER BY embedding <=> $1
LIMIT 10
```
