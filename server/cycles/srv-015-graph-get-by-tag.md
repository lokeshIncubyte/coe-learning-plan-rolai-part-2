---
id: srv-015
slug: graph-get-by-tag
status: done
source: "srv-015 spec — GraphService.getEntitiesByTag calls findMany with tags has filter"
covers: happy-path
---

## Behavior
`GraphService.getEntitiesByTag(tag)` calls `prisma.entity.findMany({ where: { tags: { has: tag } } })` and returns the result array.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  // Add inside the existing describe('GraphService') block.

  describe('getEntitiesByTag', () => {
    it('calls findMany with the tags.has filter and returns results', async () => {
      const entities = [{ id: 'e2', type: 'location', name: 'Cave', tags: ['dangerous'] }];
      (mockPrisma.entity.findMany as jest.Mock).mockResolvedValueOnce(entities);

      const result = await service.getEntitiesByTag('dangerous');

      expect(mockPrisma.entity.findMany).toHaveBeenCalledWith({
        where: { tags: { has: 'dangerous' } },
      });
      expect(result).toEqual(entities);
    });
  });
  ```
- **Why it fails**: `getEntitiesByTag` does not exist on `GraphService`.

## GREEN
- **Smallest change**: Add `async getEntitiesByTag(tag: string)` to `src/generate/graph.service.ts`. It returns `this.prisma.entity.findMany({ where: { tags: { has: tag } } })`.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
