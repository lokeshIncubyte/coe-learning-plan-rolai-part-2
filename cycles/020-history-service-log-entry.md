---
id: cycle-020
slug: history-service-log-entry
status: pending
source: "§2 GenerationHistory Logging Fix — HistoryService.logEntry"
covers: happy-path
group: history-logging
---

## Dependencies

### Prisma
Model: GenerationHistory
Required fields (no `?`, no default): sessionId: string, narrative: string, anchor: string
FK constraints: sessionId → Session.id
Unique constraints: id
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
HistoryService.logEntry(sessionId, narrative, anchor, deltas) calls prisma.generationHistory.create with the provided fields and returns void. New service at `src/generate/history.service.ts`.

## RED
- **Test file**: `src/generate/history.service.spec.ts`
- **Assertion**:
  ```ts
  import { HistoryService } from './history.service'

  describe('HistoryService', () => {
    it('logEntry calls prisma.generationHistory.create with correct fields', async () => {
      const mockPrisma = {
        generationHistory: { create: jest.fn().mockResolvedValue({ id: 'hist-1' }) },
      }
      const service = new HistoryService(mockPrisma as any)
      await service.logEntry('sess-1', 'A dragon appears.', 'entity-42', [])
      expect(mockPrisma.generationHistory.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'sess-1',
          narrative: 'A dragon appears.',
          anchor: 'entity-42',
          deltas: [],
        },
      })
    })
  })
  ```
- **Why it fails**: `HistoryService` does not exist in `src/generate/history.service.ts`

## GREEN
- **Smallest change**: Create `src/generate/history.service.ts` with `@Injectable() HistoryService` that injects `PrismaService` and exposes `async logEntry(sessionId: string, narrative: string, anchor: string, deltas: unknown[]): Promise<void>` calling `prisma.generationHistory.create`.
- **Files touched**: `src/generate/history.service.ts`

## REFACTOR
none
