---
id: cycle-020
slug: history-get-by-session
status: pending
source: "cycle-020 spec — GenerationHistoryService.getHistoryBySession paginates findMany by session"
covers: happy-path
---

## Behavior
`GenerationHistoryService.getHistoryBySession(sessionId, page, limit)` calls `prisma.generationHistory.findMany` with `where: { sessionId }`, `skip: (page - 1) * limit`, `take: limit`, and `orderBy: { createdAt: 'desc' }`, returning the result array.

## RED
- **Test file**: `src/history/generation-history.service.spec.ts`
- **Assertion**:
  ```ts
  // Add inside the existing describe('GenerationHistoryService') block.

  describe('getHistoryBySession', () => {
    it('calls findMany with correct where, skip, take, and orderBy params and returns results', async () => {
      const records = [{ id: 'h2', sessionId: 's1', narrative: 'Later...' }];
      (mockPrisma.generationHistory.findMany as jest.Mock).mockResolvedValueOnce(records);

      const result = await service.getHistoryBySession('s1', 2, 5);

      expect(mockPrisma.generationHistory.findMany).toHaveBeenCalledWith({
        where: { sessionId: 's1' },
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(records);
    });

    it('skips 0 records when page is 1', async () => {
      (mockPrisma.generationHistory.findMany as jest.Mock).mockResolvedValueOnce([]);

      await service.getHistoryBySession('s1', 1, 10);

      expect(mockPrisma.generationHistory.findMany).toHaveBeenCalledWith({
        where: { sessionId: 's1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });
  ```
- **Why it fails**: `getHistoryBySession` does not exist on `GenerationHistoryService`.

## GREEN
- **Smallest change**: Add `async getHistoryBySession(sessionId: string, page: number, limit: number)` to `src/history/generation-history.service.ts`. It returns `this.prisma.generationHistory.findMany({ where: { sessionId }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } })`.
- **Files touched**: `src/history/generation-history.service.ts`

## REFACTOR
none
