---
id: cycle-067
slug: generation-history-get-by-delta-category
status: done
source: "Logged entries are queryable by category for debugging and replay"
covers: atomic
---

## Behavior
`GenerationHistoryService.getHistoryByDeltaCategory(op)` queries `GenerationHistory` records whose `deltas` JSON array contains at least one entry with the given `op` value, using a PostgreSQL JSONB containment query via `$queryRaw`.

## RED
- **Test file**: `src/history/generation-history.service.spec.ts`
- **Assertion**:
  ```ts
  describe('getHistoryByDeltaCategory', () => {
    it('queries generationHistory records containing deltas with the given op category', async () => {
      const mockPrisma2 = {
        ...mockPrisma,
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'h1' }]),
      } as unknown as PrismaService;
      const svc2 = new GenerationHistoryService(mockPrisma2);

      const result = await svc2.getHistoryByDeltaCategory('identity_shift');

      expect(mockPrisma2.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'h1' }]);
    });
  });
  ```
- **Why it fails**: `getHistoryByDeltaCategory` does not exist on `GenerationHistoryService`.

## GREEN
- **Smallest change**: Add `async getHistoryByDeltaCategory(op: string)` to `GenerationHistoryService` that calls:
  ```ts
  return this.prisma.$queryRaw`
    SELECT * FROM "GenerationHistory"
    WHERE deltas::jsonb @> ${JSON.stringify([{ op }])}::jsonb
    ORDER BY "createdAt" DESC
  `;
  ```
- **Files touched**: `src/history/generation-history.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/generation-history-get-by-delta-category
git commit -m "feat(cycle-067): <summary>"
git branch -D tdd/generation-history-get-by-delta-category
```
