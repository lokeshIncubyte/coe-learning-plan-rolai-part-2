---
id: cycle-025
slug: session-service-export
status: pending
source: "§5 Session Export — SessionService.exportSession"
covers: happy-path
group: session-export
---

## Dependencies

### Prisma
Model: Session (with nested GenerationHistory)
```
export type SessionWhereUniqueInput = { id?: string }
```
Query: `prisma.session.findUniqueOrThrow({ where: { id }, include: { history: true } })`

## Behavior
`SessionService.exportSession(id: string)` returns the full session object including nested history array. Throws if session not found (P2025). New method on existing `SessionService`.

## RED
- **Test file**: `src/generate/session.service.spec.ts`
- **Assertion**:
  ```ts
  describe('SessionService — exportSession', () => {
    it('returns session with nested history', async () => {
      const mockSession = {
        id: 'sess-export',
        createdAt: new Date(),
        history: [{ id: 'h1', sessionId: 'sess-export', narrative: 'Beat 1', anchor: 'e1', deltas: [], createdAt: new Date() }],
      }
      const mockPrisma = {
        session: {
          create: jest.fn().mockResolvedValue({ id: 'sess-abc', createdAt: new Date() }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(mockSession),
        },
      }
      const service = new SessionService(mockPrisma as any)
      const result = await service.exportSession('sess-export')
      expect(result).toEqual(mockSession)
      expect(mockPrisma.session.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'sess-export' },
        include: { history: true },
      })
    })
  })
  ```
- **Why it fails**: `SessionService.exportSession` does not exist.

## GREEN
- **Smallest change**: Add `async exportSession(id: string)` to `SessionService` calling `this.prisma.session.findUniqueOrThrow({ where: { id }, include: { history: true } })`.
- **Files touched**: `src/generate/session.service.ts`

## REFACTOR
none
