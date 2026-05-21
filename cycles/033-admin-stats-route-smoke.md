---
id: cycle-033
slug: admin-stats-route-smoke
status: pending
source: "§8 Admin Dashboard — GET /api/admin/stats route"
covers: happy-path
group: admin-dashboard
boundary-covered-by: "cycle-031"
---

## Dependencies

**(none — routing smoke; Prisma boundary covered by cycle-031/032)**

## Behavior
A `GET /admin/stats` route exists in a new `AdminController` and delegates to `AdminStatsService.getStats()`. Returns the stats object.

## RED
- **Test file**: `src/admin/admin.controller.spec.ts`
- **Assertion**:
  ```ts
  import { Test, TestingModule } from '@nestjs/testing'
  import { AdminController } from './admin.controller'
  import { AdminStatsService } from './admin-stats.service'

  describe('AdminController routing smoke', () => {
    it('getStats delegates to adminStatsService.getStats and returns result', async () => {
      const statsResult = { entityCount: 10, edgeCount: 5, sessionCount: 2, historyCount: 20, latestHistoryAt: new Date() }
      const getStats = jest.fn().mockResolvedValue(statsResult)
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AdminController],
        providers: [{ provide: AdminStatsService, useValue: { getStats } }],
      }).compile()
      const controller = module.get(AdminController)
      const result = await controller.getStats()
      expect(getStats).toHaveBeenCalledTimes(1)
      expect(result).toEqual(statsResult)
    })
  })
  ```
- **Why it fails**: `AdminController` does not exist.

## GREEN
- **Smallest change**: Create `src/admin/admin.controller.ts` with `@Controller('admin') AdminController` injecting `AdminStatsService` with `@Get('stats') getStats()` calling `this.adminStatsService.getStats()`. Create `src/admin/admin.module.ts` and import it in `AppModule`.
- **Files touched**: `src/admin/admin.controller.ts`, `src/admin/admin.module.ts`, `src/app.module.ts`

## REFACTOR
none
