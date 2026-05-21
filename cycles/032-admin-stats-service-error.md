---
id: cycle-032
slug: admin-stats-service-error
status: pending
source: "§8 Admin Dashboard — AdminStatsService.getStats error path"
covers: error-path
group: admin-dashboard
---

## Dependencies

### Prisma
Error class: `PrismaClientKnownRequestError` from `@prisma/client/runtime/library`
```
// prisma.entity.count() can throw PrismaClientKnownRequestError (e.g. P1001 connection error)
```

## Behavior
When any Prisma count query throws, `AdminStatsService.getStats()` propagates the error.

## RED
- **Test file**: `src/admin/admin-stats.service.spec.ts`
- **Assertion**:
  ```ts
  import { PrismaClientKnownRequestError } from '@prisma/client'
  import { AdminStatsService } from './admin-stats.service'

  describe('AdminStatsService — error path', () => {
    it('propagates PrismaClientKnownRequestError when count fails', async () => {
      const connErr = new PrismaClientKnownRequestError('Connection failed', { code: 'P1001', clientVersion: '5.0.0' })
      const mockPrisma = {
        entity: { count: jest.fn().mockRejectedValue(connErr) },
        edge: { count: jest.fn().mockResolvedValue(0) },
        session: { count: jest.fn().mockResolvedValue(0) },
        generationHistory: {
          count: jest.fn().mockResolvedValue(0),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      }
      const service = new AdminStatsService(mockPrisma as any)
      await expect(service.getStats()).rejects.toThrow(PrismaClientKnownRequestError)
    })
  })
  ```
- **Why it fails**: `AdminStatsService` does not exist yet (cycle-031 must be done first).

## GREEN
- **Smallest change**: No production change needed — Promise.all naturally propagates the first rejection.
- **Files touched**: `src/admin/admin-stats.service.spec.ts` (test only)

## REFACTOR
none
