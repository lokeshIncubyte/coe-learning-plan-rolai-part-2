---
id: cycle-016
slug: graph-create-edge
status: pending
source: "cycle-016 spec — GraphService.createEdge calls prisma.edge.create and returns created edge"
covers: happy-path
---

## Behavior
`GraphService.createEdge(data)` calls `prisma.edge.create({ data })` and returns the created edge record.

## RED
- **Test file**: `src/generate/graph.service.spec.ts`
- **Assertion**:
  ```ts
  // Add inside the existing describe('GraphService') block.

  describe('createEdge', () => {
    it('calls prisma.edge.create with data and returns the created edge', async () => {
      const created = {
        id: 'edge1',
        fromId: 'e1',
        toId: 'e2',
        type: 'knows',
        weight: 1.0,
        tags: [],
      };
      (mockPrisma.edge.create as jest.Mock).mockResolvedValueOnce(created);

      const result = await service.createEdge({
        fromId: 'e1',
        toId: 'e2',
        type: 'knows',
        tags: [],
      });

      expect(mockPrisma.edge.create).toHaveBeenCalledWith({
        data: { fromId: 'e1', toId: 'e2', type: 'knows', tags: [] },
      });
      expect(result).toEqual(created);
    });
  });
  ```
- **Why it fails**: `createEdge` does not exist on `GraphService`.

## GREEN
- **Smallest change**: Add `async createEdge(data: any)` to `src/generate/graph.service.ts`. It returns `this.prisma.edge.create({ data })`.
- **Files touched**: `src/generate/graph.service.ts`

## REFACTOR
none
