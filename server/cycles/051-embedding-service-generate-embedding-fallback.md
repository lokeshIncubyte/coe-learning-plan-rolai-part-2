---
id: cycle-051
slug: embedding-service-generate-embedding-fallback
status: pending
source: "Group B: EmbeddingService.generateEmbedding — zero-vector fallback when proxy is unreachable"
covers: error-path
group: embedding-service
---

## Behavior
When the ONNX embedding proxy is unreachable (the OpenAI SDK call rejects), `EmbeddingService.generateEmbedding(text)` logs a warning and returns a zero-vector of length 384 rather than throwing. This ensures the rest of the pipeline degrades gracefully to flat-entity fallback instead of crashing. The happy path (successful call) is covered in cycle-031.

## RED
- **Test file**: `src/generate/embedding.service.spec.ts`
- **Assertion** (add inside the existing `describe('generateEmbedding')` block, after the happy-path test):
  ```ts
  it('returns a zero-vector when the proxy throws', async () => {
    // Override the mock to throw for this test
    const OpenAI = require('openai').default;
    OpenAI.mockImplementationOnce(() => ({
      embeddings: {
        create: jest.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')),
      },
    }));
    const svc = new EmbeddingService(mockPrisma, mockConfig);
    const result = await svc.generateEmbedding('any text');
    expect(result).toHaveLength(384);
    expect(result.every((v: number) => v === 0)).toBe(true);
  });
  ```
- **Why it fails**: After cycle-031's GREEN, `generateEmbedding` calls `this.openai.embeddings.create` with no try/catch — the rejected promise propagates as an unhandled rejection instead of returning a zero-vector.

## GREEN
- **Smallest change**: Wrap the body of `generateEmbedding` in a try/catch. On catch, call `this.logger.warn(...)` and return `new Array(EmbeddingService.EMBEDDING_DIM).fill(0)`.
- **Files touched**: `src/generate/embedding.service.ts`

## REFACTOR
none
