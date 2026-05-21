---
id: cycle-018
slug: session-service-create-session
status: done
source: "§4 Session Model — SessionService.createSession"
covers: happy-path
group: session-model
boundary-covered-by: ""
---

## Dependencies

### Prisma
Model: Session
Required fields (no `?`, no default): none (id is cuid auto, createdAt is auto)
FK constraints: none
Unique constraints: id
```
export type SessionCreateInput = {
  id?: string
  createdAt?: Date | string
  history?: GenerationHistoryCreateNestedManyWithoutSessionInput
}
export type SessionUncheckedCreateInput = {
  id?: string
  createdAt?: Date | string
  history?: GenerationHistoryUncheckedCreateNestedManyWithoutSessionInput
}
```

## Behavior
SessionService.createSession() calls prisma.session.create and returns the new session's id string. The new service lives at `src/generate/session.service.ts`.

## RED
- **Test file**: `src/generate/session.service.spec.ts`
- **Assertion**:
  ```ts
  import { SessionService } from './session.service'

  describe('SessionService', () => {
    it('createSession returns the new session id', async () => {
      const mockPrisma = {
        session: { create: jest.fn().mockResolvedValue({ id: 'sess-abc', createdAt: new Date() }) },
      }
      const service = new SessionService(mockPrisma as any)
      const id = await service.createSession()
      expect(id).toBe('sess-abc')
      expect(mockPrisma.session.create).toHaveBeenCalledWith({ data: {} })
    })
  })
  ```
- **Why it fails**: `SessionService` does not exist in `src/generate/session.service.ts`

## GREEN
- **Smallest change**: Create `src/generate/session.service.ts` with `@Injectable() SessionService` that injects `PrismaService` and exposes `async createSession(): Promise<string>` calling `this.prisma.session.create({ data: {} })` and returning `.id`.
- **Files touched**: `src/generate/session.service.ts`

## REFACTOR
none
