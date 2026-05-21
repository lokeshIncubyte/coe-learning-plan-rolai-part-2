---
id: cycle-019
slug: session-service-create-session-error
status: skip
source: "§4 Session Model — SessionService.createSession error path"
covers: error-path
group: session-model
---

## Dependencies

### Prisma
Model: Session
Required fields: none (all optional at create)
Error class: `PrismaClientKnownRequestError` from `@prisma/client/runtime/library`
```
export type SessionUncheckedCreateInput = {
  id?: string
  createdAt?: Date | string
  history?: GenerationHistoryUncheckedCreateNestedManyWithoutSessionInput
}
```

## Behavior
When prisma.session.create throws a PrismaClientKnownRequestError, SessionService.createSession propagates the error (does not swallow it).

> **Ordering note**: Run after cycle-018. RED fails until cycle-018 creates SessionService; once cycle-018 is done, this test passes without additional production code.

## RED
- **Test file**: `src/generate/session.service.spec.ts`
- **Assertion**:
  ```ts
  import { PrismaClientKnownRequestError } from '@prisma/client'
  import { SessionService } from './session.service'

  describe('SessionService — error path', () => {
    it('propagates PrismaClientKnownRequestError from session.create', async () => {
      const dbErr = new PrismaClientKnownRequestError('Connection failed', { code: 'P1001', clientVersion: '5.0.0' })
      const mockPrisma = {
        session: { create: jest.fn().mockRejectedValue(dbErr) },
      }
      const service = new SessionService(mockPrisma as any)
      await expect(service.createSession()).rejects.toThrow(PrismaClientKnownRequestError)
    })
  })
  ```
- **Why it fails**: `SessionService` does not exist yet (cycle-018 must be done first), and no error handling is specified; the method needs to not swallow the error.

## GREEN
- **Smallest change**: No change needed to SessionService beyond cycle-018 — `async createSession()` with no try/catch naturally propagates. This cycle validates that behavior explicitly.
- **Files touched**: `src/generate/session.service.spec.ts` (test only; no production change if cycle-018 is done)

## REFACTOR
none
