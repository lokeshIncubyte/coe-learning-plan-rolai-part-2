---
id: cycle-032
slug: embedding-service-embed-entity-identity
status: pending
source: "Group B: EmbeddingService.embedEntityIdentity — reads entity, writes vector via $executeRawUnsafe"
covers: happy-path
group: embedding-service
---

## Behavior
`EmbeddingService.embedEntityIdentity(entityId)` reads the entity from Prisma, builds its identity text, generates a 384-dim embedding, and writes the vector to the `embedding` column using `$executeRawUnsafe`. The raw SQL is used instead of parameterised `$executeRaw` because the pgvector adapter misparses the vector string when it is passed as a `$1` parameter, producing a wrong-dimension result. When the entity is not found, the method returns silently without throwing.

## RED
- **Test file**: `src/generate/embedding.service.spec.ts`
- **Assertion**:
  ```ts
  describe('embedEntityIdentity', () => {
    it('reads the entity, builds identity text, generates embedding, and writes via $executeRawUnsafe', async () => {
      const entity = {
        id: 'e1', name: 'Elara', type: 'character',
        archetype: 'Mage', backstory: null, role: null,
      };
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(entity);
      (mockPrisma.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(1);

      await service.embedEntityIdentity('e1');

      expect(mockPrisma.entity.findUnique).toHaveBeenCalledWith({ where: { id: 'e1' } });
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('skips and does not throw when entity is not found', async () => {
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.embedEntityIdentity('missing')).resolves.toBeUndefined();
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });
  ```
- **Why it fails**: `service.embedEntityIdentity` is `undefined` — the method does not exist yet.

## GREEN
- **Smallest change**: Add `async embedEntityIdentity(entityId: string): Promise<void>` to `EmbeddingService`. Fetch the entity with `prisma.entity.findUnique`; return early if null. Call `buildIdentityText`, then `generateEmbedding`. Format the vector as `[${embedding.join(',')}]` and execute: `await this.prisma.$executeRawUnsafe(\`UPDATE "Entity" SET embedding = '${embeddingStr}'::vector WHERE id = $1\`, entityId)`.
- **Files touched**: `src/generate/embedding.service.ts`

## REFACTOR
none
