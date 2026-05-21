---
id: cycle-026
slug: session-service-export-error
status: skip
source: "§5 Session Export — SessionService.exportSession error path (session not found)"
covers: error-path
group: session-export
---

## Dependencies

### Prisma
Model: Session
Error class: `PrismaClientKnownRequestError` from `@prisma/client/runtime/library`
Not-found code: P2025
```
export type SessionWhereUniqueInput = { id?: string }
```

## Behavior
When prisma.session.findUniqueOrThrow throws P2025 (not found), SessionService.exportSession propagates the error.

## RED
- **Test file**: `src/generate/session.service.spec.ts`
- **Assertion**:
  ```ts
  import { PrismaClientKnownRequestError } from '@prisma/client'

  describe('SessionService — exportSession error', () => {
    it('propagates PrismaClientKnownRequestError P2025 when session not found', async () => {
      const notFound = new PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: '5.0.0' })
      const mockPrisma = {
        session: {
          create: jest.fn().mockResolvedValue({ id: 'x' }),
          findUniqueOrThrow: jest.fn().mockRejectedValue(notFound),
        },
      }
      const service = new SessionService(mockPrisma as any)
      await expect(service.exportSession('bad-id')).rejects.toThrow(PrismaClientKnownRequestError)
    })
  })
  ```
- **Why it fails**: `SessionService.exportSession` does not exist yet (cycle-025 must be done first).

## GREEN
- **Smallest change**: No production change needed — natural propagation from cycle-025 implementation.
- **Files touched**: `src/generate/session.service.spec.ts` (test only)

## REFACTOR
none
