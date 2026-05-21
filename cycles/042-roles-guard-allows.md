---
id: cycle-042
slug: roles-guard-allows
status: done
source: "RolesGuard + @Roles decorator — guards routes by role; allows when user role matches"
covers: happy-path
group: roles-guard
---

## Dependencies

**(none — pure logic cycle; Reflector is @nestjs/core utility, not an external boundary)**

## Behavior
Create `@Roles(...roles: string[])` decorator using `SetMetadata` and `ROLES_KEY = 'roles'`. Create `RolesGuard` implementing `CanActivate`: uses `Reflector.getAllAndOverride(ROLES_KEY, [handler, class])` to get required roles, then reads `request.user.role`. Returns `true` when the user's role is in the required roles list. Files: `src/auth/roles.decorator.ts` and `src/auth/roles.guard.ts`.

## RED
- **Test file**: `src/auth/roles.guard.spec.ts`
- **Assertion**:
  ```ts
  import { ExecutionContext, ForbiddenException } from '@nestjs/common'
  import { Reflector } from '@nestjs/core'
  import { RolesGuard } from './roles.guard'

  describe('RolesGuard — allows', () => {
    it('returns true when user role matches required role', () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) }
      const guard = new RolesGuard(reflector as unknown as Reflector)
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user: { role: 'ADMIN' } }),
        }),
      } as unknown as ExecutionContext
      expect(guard.canActivate(context)).toBe(true)
    })

    it('returns true when no roles are required (unprotected route)', () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue(null) }
      const guard = new RolesGuard(reflector as unknown as Reflector)
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user: { role: 'USER' } }),
        }),
      } as unknown as ExecutionContext
      expect(guard.canActivate(context)).toBe(true)
    })
  })
  ```
- **Why it fails**: `RolesGuard` does not exist at `src/auth/roles.guard.ts`.

## GREEN
- **Smallest change**: Create `src/auth/roles.decorator.ts` with `export const ROLES_KEY = 'roles'` and `export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)`. Create `src/auth/roles.guard.ts` with `@Injectable() RolesGuard implements CanActivate`: inject `Reflector`, in `canActivate` get required roles via `reflector.getAllAndOverride(ROLES_KEY, [ctx.getHandler(), ctx.getClass()])`, if no roles return `true`, check `request.user?.role`, if match return `true`, else throw `new ForbiddenException()`.
- **Files touched**: `src/auth/roles.decorator.ts`, `src/auth/roles.guard.ts`

## REFACTOR
none
