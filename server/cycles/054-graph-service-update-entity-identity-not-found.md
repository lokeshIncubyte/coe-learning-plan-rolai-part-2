---
id: cycle-054
slug: graph-service-update-entity-identity-not-found
status: done
source: "GraphService.updateEntityIdentity — throws NotFoundException when entity is not found"
covers: error-path
group: graph-service-hybrid-vector-graph
---

## Behavior
When `updateEntityIdentity` is called with an `id` that does not exist in the database, the method throws `NotFoundException` before attempting any write. This prevents a Prisma error from propagating to the caller and communicates the failure with the correct HTTP 404 semantics. The happy path (entity found, identity updated, hook fired) is covered in cycle-038.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion** (add inside the existing `describe('updateEntityIdentity')` block, after the happy-path test):
  ```ts
  it('throws NotFoundException when entity not found', async () => {
    (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.updateEntityIdentity('missing', { archetype: 'Warrior' }))
      .rejects.toThrow(NotFoundException);
  });
  ```
- **Why it fails**: After cycle-038's GREEN, `updateEntityIdentity` calls `prisma.entity.update` without checking whether `findUnique` returned null — Prisma throws its own error (record not found) rather than a NestJS `NotFoundException`.

## GREEN
- **Smallest change**: In `updateEntityIdentity`, after `prisma.entity.findUnique` resolves, add `if (!before) throw new NotFoundException(\`Entity \${id} not found\`);` before the `entity.update` call. Import `NotFoundException` from `@nestjs/common` if not already imported.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
