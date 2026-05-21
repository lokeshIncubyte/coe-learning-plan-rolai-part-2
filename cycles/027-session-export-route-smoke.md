---
id: cycle-027
slug: session-export-route-smoke
status: pending
source: "§5 Session Export — GET /api/session/:id/export route"
covers: happy-path
group: session-export
boundary-covered-by: "cycle-025"
---

## Dependencies

**(none — pure routing smoke; boundary covered by cycle-025)**

## Behavior
A `GET /api/session/:id/export` route exists in a new `SessionController` and delegates to `SessionService.exportSession`. Returns the session JSON. The routing smoke validates the route exists and returns the service value.

## RED
- **Test file**: `src/generate/session.controller.spec.ts`
- **Assertion**:
  ```ts
  import { Test, TestingModule } from '@nestjs/testing'
  import { SessionController } from './session.controller'
  import { SessionService } from './session.service'

  describe('SessionController — GET /session/:id/export routing smoke', () => {
    it('exportSession delegates to sessionService.exportSession and returns result', async () => {
      const exportSession = jest.fn().mockResolvedValue({ id: 'sess-1', history: [] })
      const module: TestingModule = await Test.createTestingModule({
        controllers: [SessionController],
        providers: [{ provide: SessionService, useValue: { createSession: jest.fn(), exportSession } }],
      }).compile()
      const controller = module.get(SessionController)
      const result = await controller.exportSession('sess-1')
      expect(exportSession).toHaveBeenCalledWith('sess-1')
      expect(result).toEqual({ id: 'sess-1', history: [] })
    })
  })
  ```
- **Why it fails**: `SessionController` does not exist.

## GREEN
- **Smallest change**: Create `src/generate/session.controller.ts` with `@Controller('session') SessionController` injecting `SessionService`, with `@Get(':id/export') exportSession(@Param('id') id: string)` calling `this.sessionService.exportSession(id)`. Register in `generate.module.ts`.
- **Files touched**: `src/generate/session.controller.ts`, `src/generate/generate.module.ts`

## REFACTOR
none
