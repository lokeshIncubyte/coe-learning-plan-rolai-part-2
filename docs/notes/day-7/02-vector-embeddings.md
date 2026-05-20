# Vector Embeddings

## What they are

An embedding is a fixed-length array of floats that encodes the *meaning* of a piece of text. Texts with similar meaning produce vectors that point in similar directions in high-dimensional space.

```
"The knight charges forward"  → [0.12, -0.83, 0.44, ...]  ← 1536 floats
"The warrior rushes ahead"    → [0.11, -0.81, 0.46, ...]  ← nearby vector
"The soup is too hot"         → [-0.72, 0.23, -0.19, ...]  ← distant vector
```

## Why cosine similarity works

Cosine similarity measures the angle between two vectors, not their magnitude:

```
similarity = (A · B) / (|A| × |B|)

Range: -1 (opposite) to 1 (identical direction)
```

Two texts about the same concept point in the same direction even if phrased differently — that's what cosine captures. Magnitude doesn't matter (a short sentence and a long one about the same topic still align).

**Cosine distance** = `1 - cosine_similarity` (pgvector uses `<=>` for this).

## Properties relevant here

- **Model-specific**: embeddings from `text-embedding-3-small` can only be compared to other embeddings from the same model
- **Immutable**: if the text changes, you must re-embed
- **Dimensionality**: `text-embedding-3-small` = 1536 dims; can be truncated to 256/512 with Matryoshka without major quality loss
- **No grammar**: "knight charges" and "charges knight" produce very similar vectors — order matters less than token identity

## In this project

Each `Entity` gets an embedding generated from `name + facts`. At query time, the player's action prompt is embedded on the fly and compared against all entity embeddings to find semantically relevant entities before traversal.
