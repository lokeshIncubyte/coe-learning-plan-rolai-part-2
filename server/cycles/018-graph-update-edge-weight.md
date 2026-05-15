---
id: cycle-018
slug: graph-update-edge-weight
status: pending
source: "cycle-018 spec — GraphService.updateEdgeWeight calls prisma.edge.update and returns updated edge"
covers: happy-path
---

## Behavior
`GraphService.updateEdgeWeight(id, weight)` calls `prisma.edge.update({ where: { id }, data: { weight } })` and returns the updated edge record.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  // Add inside the existing describe('GraphService') block.

  describe('updateEdgeWeight', () => {
    it('calls prisma.edge.update with the new weight and returns the result', async () => {
      const updated = { id: 'edge1', fromId: 'e1', toId: 'e2', type: 'knows', weight: 0.5 };
      (mockPrisma.edge.update as jest.Mock).mockResolvedValueOnce(updated);

      const result = await service.updateEdgeWeight('edge1', 0.5);

      expect(mockPrisma.edge.update).toHaveBeenCalledWith({
        where: { id: 'edge1' },
        data: { weight: 0.5 },
      });
      expect(result).toEqual(updated);
    });
  });
  ```
- **Why it fails**: `updateEdgeWeight` does not exist on `GraphService`.

## GREEN
- **Smallest change**: Add `async updateEdgeWeight(id: string, weight: number)` to `src/generate/graph.service.ts`. It returns `this.prisma.edge.update({ where: { id }, data: { weight } })`.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
