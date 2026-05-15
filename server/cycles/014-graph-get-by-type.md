---
id: cycle-014
slug: graph-get-by-type
status: pending
source: "cycle-014 spec — GraphService.getEntitiesByType calls findMany with where type filter"
covers: happy-path
---

## Behavior
`GraphService.getEntitiesByType(type)` calls `prisma.entity.findMany({ where: { type } })` and returns the resulting array.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  // Add inside the existing describe('GraphService') block.

  describe('getEntitiesByType', () => {
    it('calls findMany with the type filter and returns results', async () => {
      const entities = [{ id: 'e1', type: 'location', name: 'Forest' }];
      (mockPrisma.entity.findMany as jest.Mock).mockResolvedValueOnce(entities);

      const result = await service.getEntitiesByType('location');

      expect(mockPrisma.entity.findMany).toHaveBeenCalledWith({
        where: { type: 'location' },
      });
      expect(result).toEqual(entities);
    });
  });
  ```
- **Why it fails**: `getEntitiesByType` does not exist on `GraphService`.

## GREEN
- **Smallest change**: Add `async getEntitiesByType(type: string)` to `src/generate/graph.service.ts`. It returns `this.prisma.entity.findMany({ where: { type } })`.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
