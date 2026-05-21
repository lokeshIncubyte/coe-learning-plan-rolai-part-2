---
id: cycle-043
slug: roles-guard-denies
status: pending
source: "RolesGuard — throws ForbiddenException when user role does not match required role"
covers: error-path
group: roles-guard
---

## Dependencies

**(none — pure logic cycle)**

## Behavior
`RolesGuard.canActivate` throws `ForbiddenException` when the authenticated user's role is not in the required roles list. This is the last cycle in the roles-guard group. Integration smoke: `RolesGuard` with real `Reflector` on `AdminController.getStats` (decorated with `@Roles('ADMIN')`) — a request with `user.role = 'USER'` throws `ForbiddenException`, a request with `user.role = 'ADMIN'` returns `true`.

## RED
- **Test file**: `src/auth/roles.guard.spec.ts`
- **Assertion**:
  ```ts
  import { ExecutionContext, ForbiddenException } from '@nestjs/common'
  import { Reflector } from '@nestjs/core'
  import { RolesGuard } from './roles.guard'

  describe('RolesGuard — denies', () => {
    it('throws ForbiddenException when user role does not match', () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) }
      const guard = new RolesGuard(reflector as unknown as Reflector)
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user: { role: 'USER' } }),
        }),
      } as unknown as ExecutionContext
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })
  })
  ```
- **Why it fails**: `RolesGuard` does not exist yet (cycle-042 must be done first).

## GREEN
- **Smallest change**: No additional production code — the `throw new ForbiddenException()` branch from cycle-042 implementation covers this.
- **Files touched**: `src/auth/roles.guard.spec.ts` (test only)

## REFACTOR
none
