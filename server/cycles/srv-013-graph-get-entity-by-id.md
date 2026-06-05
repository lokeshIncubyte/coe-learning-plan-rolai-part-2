---
id: srv-013
slug: graph-get-entity-by-id
status: done
source: "srv-013 spec — GraphService.getEntityById returns entity or throws NotFoundException"
covers: error-path
---

## Behavior
`GraphService.getEntityById(id)` returns the entity when `prisma.entity.findUnique` resolves to a record, and throws `NotFoundException` with a descriptive message when it resolves to `null`.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  // Add inside the existing describe('GraphService') block,
  // after the describe('createEntity') block.

  describe('getEntityById', () => {
    it('returns the entity when found', async () => {
      const entity = { id: 'e1', type: 'character', name: 'Mira' };
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(entity);

      const result = await service.getEntityById('e1');

      expect(mockPrisma.entity.findUnique).toHaveBeenCalledWith({
        where: { id: 'e1' },
      });
      expect(result).toEqual(entity);
    });

    it('throws NotFoundException when entity is not found', async () => {
      (mockPrisma.entity.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.getEntityById('missing')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getEntityById('missing')).rejects.toThrow(
        'Entity missing not found',
      );
    });
  });
  ```
- **Why it fails**: `getEntityById` does not exist on `GraphService`.

## GREEN
- **Smallest change**: Add `async getEntityById(id: string)` to `src/generate/graph.service.ts`. It calls `this.prisma.entity.findUnique({ where: { id } })`. If the result is `null`, it throws `new NotFoundException(\`Entity ${id} not found\`)`. Otherwise it returns the result. Import `NotFoundException` from `@nestjs/common`.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
