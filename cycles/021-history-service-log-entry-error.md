---
id: cycle-021
slug: history-service-log-entry-error
status: pending
source: "§2 GenerationHistory Logging Fix — HistoryService.logEntry error path"
covers: error-path
group: history-logging
---

## Dependencies

### Prisma
Model: GenerationHistory
Required fields: sessionId, narrative, anchor
Error class: `PrismaClientKnownRequestError` from `@prisma/client/runtime/library`
FK constraint violation code: P2003 (foreign key constraint failed)
```
export type GenerationHistoryUncheckedCreateInput = {
  id?: string
  sessionId: string
  narrative: string
  anchor: string
  deltas?: JsonNullValueInput | InputJsonValue
  createdAt?: Date | string
}
```

## Behavior
When prisma.generationHistory.create throws (e.g. FK violation — sessionId not found), HistoryService.logEntry propagates the error.

## RED
- **Test file**: `src/generate/history.service.spec.ts`
- **Assertion**:
  ```ts
  import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
  import { HistoryService } from './history.service'

  describe('HistoryService — error path', () => {
    it('propagates PrismaClientKnownRequestError from generationHistory.create', async () => {
      const fkErr = new PrismaClientKnownRequestError('FK failed', { code: 'P2003', clientVersion: '5.0.0' })
      const mockPrisma = {
        generationHistory: { create: jest.fn().mockRejectedValue(fkErr) },
      }
      const service = new HistoryService(mockPrisma as any)
      await expect(service.logEntry('bad-sess', 'narrative', 'anchor', [])).rejects.toThrow(PrismaClientKnownRequestError)
    })
  })
  ```
- **Why it fails**: `HistoryService` does not exist yet (cycle-020 must be done first).

## GREEN
- **Smallest change**: No production change needed — natural propagation from cycle-020 implementation.
- **Files touched**: `src/generate/history.service.spec.ts` (test only)

## REFACTOR
none
