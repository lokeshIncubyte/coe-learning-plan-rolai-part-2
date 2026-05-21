---
id: cycle-031
slug: admin-stats-service-get-stats
status: done
source: "§8 Admin Dashboard — AdminStatsService.getStats"
covers: happy-path
group: admin-dashboard
---

## Dependencies

### Prisma
Models: Entity, Session, GenerationHistory, Edge
Queries: prisma.entity.count(), prisma.session.count(), prisma.generationHistory.count(), prisma.edge.count()
```
export type EntityWhereInput = { ... }
// prisma.entity.count(): Promise<number>
// prisma.session.count(): Promise<number>
// prisma.generationHistory.count(): Promise<number>
// prisma.edge.count(): Promise<number>
```

## Behavior
`AdminStatsService.getStats()` returns `{ entityCount, edgeCount, sessionCount, historyCount, latestHistoryAt }` using Prisma count queries and findFirst for the latest GenerationHistory. New service at `src/admin/admin-stats.service.ts`.

## RED
- **Test file**: `src/admin/admin-stats.service.spec.ts`
- **Assertion**:
  ```ts
  import { AdminStatsService } from './admin-stats.service'

  describe('AdminStatsService', () => {
    it('getStats returns counts from prisma', async () => {
      const latestDate = new Date('2026-05-21')
      const mockPrisma = {
        entity: { count: jest.fn().mockResolvedValue(42) },
        edge: { count: jest.fn().mockResolvedValue(15) },
        session: { count: jest.fn().mockResolvedValue(3) },
        generationHistory: {
          count: jest.fn().mockResolvedValue(271),
          findFirst: jest.fn().mockResolvedValue({ createdAt: latestDate }),
        },
      }
      const service = new AdminStatsService(mockPrisma as any)
      const stats = await service.getStats()
      expect(stats).toEqual({
        entityCount: 42,
        edgeCount: 15,
        sessionCount: 3,
        historyCount: 271,
        latestHistoryAt: latestDate,
      })
    })
  })
  ```
- **Why it fails**: `AdminStatsService` does not exist in `src/admin/admin-stats.service.ts`.

## GREEN
- **Smallest change**: Create `src/admin/` directory and `admin-stats.service.ts` with `@Injectable() AdminStatsService` injecting `PrismaService`. `async getStats()` runs `Promise.all([entity.count, edge.count, session.count, history.count, history.findFirst({ orderBy: { createdAt: 'desc' } })])` and returns the shaped object.
- **Files touched**: `src/admin/admin-stats.service.ts`

## REFACTOR
none
