---
id: cycle-031
slug: embedding-service-generate-embedding
status: done
source: "Group B: EmbeddingService.generateEmbedding — calls ONNX proxy and returns the embedding array"
covers: happy-path
group: embedding-service
---

## Behavior
`EmbeddingService.generateEmbedding(text)` calls the local ONNX embedding proxy (`helper-apis`) via the OpenAI SDK and returns a 384-element `number[]`. This cycle covers the happy path only — the error/fallback path is covered in cycle-051.

## RED
- **Test file**: `src/generate/embedding.service.spec.ts`
- **Assertion**:
  ```ts
  describe('generateEmbedding', () => {
    it('calls openai embeddings.create and returns the embedding array', async () => {
      // The OpenAI mock is set up at the top of the spec; override create here to return a 384-element array
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        embeddings: {
          create: jest.fn().mockResolvedValueOnce({
            data: [{ embedding: Array.from({ length: 384 }, () => 0.5) }],
          }),
        },
      }));
      const svc = new EmbeddingService(mockPrisma, mockConfig);
      const result = await svc.generateEmbedding('test text');
      expect(result).toHaveLength(384);
      expect(typeof result[0]).toBe('number');
    });
  });
  ```
- **Why it fails**: `EmbeddingService.generateEmbedding` does not exist yet — `svc.generateEmbedding` is `undefined`; calling it throws `TypeError: svc.generateEmbedding is not a function`.

## GREEN
- **Smallest change**: Add `async generateEmbedding(text: string): Promise<number[]>` to `EmbeddingService`. Call `this.openai.embeddings.create({ model: this.model, input: text })` and return `response.data[0].embedding`. Add `static readonly EMBEDDING_DIM = 384` and `private readonly model = 'Xenova/all-MiniLM-L6-v2'` class fields. No try/catch yet — that is added in cycle-051.
- **Files touched**: `src/generate/embedding.service.ts`

## REFACTOR
none
