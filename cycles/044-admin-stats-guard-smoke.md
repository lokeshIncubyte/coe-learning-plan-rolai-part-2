---
id: cycle-044
slug: admin-stats-guard-smoke
status: done
source: "Protect GET /admin/stats — require ADMIN role via @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')"
covers: routing-smoke
group: admin-protection
boundary-covered-by: cycle-042
---

## Dependencies

**(none — routing smoke; boundary covered by cycle-042 and cycle-043)**

## Behavior
`AdminController.getStats` is decorated with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN')`. The routing smoke verifies that a real `RolesGuard` with real `Reflector` on the real `AdminController.getStats` handler correctly denies a USER-role request. The integration smoke (GET /api/admin/stats with ADMIN JWT returns 200, with USER JWT returns 403) is run manually before squash.

## RED
- **Test file**: `src/admin/admin.controller.spec.ts`
- **Assertion**:
  ```ts
  import { Reflector } from '@nestjs/core'
  import { ForbiddenException } from '@nestjs/common'
  import { AdminController } from './admin.controller'
  import { RolesGuard } from '../auth/roles.guard'

  describe('AdminController — @Roles guard integration smoke', () => {
    it('RolesGuard denies USER role on getStats', () => {
      const reflector = new Reflector()
      const guard = new RolesGuard(reflector)
      const context = {
        getHandler: () => AdminController.prototype.getStats,
        getClass: () => AdminController,
        switchToHttp: () => ({ getRequest: () => ({ user: { role: 'USER' } }) }),
      } as any
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })
  })
  ```
- **Why it fails**: `AdminController` does not exist yet (cycle-033 must be done first), and `AdminController.getStats` does not have `@Roles('ADMIN')` applied.

## GREEN
- **Smallest change**: Add `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN')` decorators to `AdminController.getStats`. Create `src/auth/jwt-auth.guard.ts` with `@Injectable() export class JwtAuthGuard extends AuthGuard('jwt') {}`. Register `JwtAuthGuard` and `RolesGuard` in `AdminModule`.
- **Files touched**: `src/admin/admin.controller.ts`, `src/auth/jwt-auth.guard.ts`, `src/admin/admin.module.ts`

## REFACTOR
none
