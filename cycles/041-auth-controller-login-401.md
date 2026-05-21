---
id: cycle-041
slug: auth-controller-login-401
status: done
source: "POST /auth/login — 401 UnauthorizedException when validateUser returns null"
covers: error-path
group: auth-controller
---

## Dependencies

**(none — pure controller logic; AuthService mocked)**

## Behavior
`AuthController.login` throws `UnauthorizedException` when `authService.validateUser` returns `null`. This is the last cycle in the auth-controller group. Integration smoke: `POST /api/auth/login` with `{ email: 'admin@platform.com', password: 'login' }` against the running NestJS app returns HTTP 200 with `{ accessToken: <string> }`.

## RED
- **Test file**: `src/auth/auth.controller.spec.ts`
- **Assertion**:
  ```ts
  import { Test, TestingModule } from '@nestjs/testing'
  import { UnauthorizedException } from '@nestjs/common'
  import { AuthController } from './auth.controller'
  import { AuthService } from './auth.service'

  describe('AuthController POST /auth/login — 401', () => {
    it('throws UnauthorizedException when validateUser returns null', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [{
          provide: AuthService,
          useValue: { validateUser: jest.fn().mockResolvedValue(null), login: jest.fn() },
        }],
      }).compile()

      const controller = module.get(AuthController)
      await expect(controller.login({ email: 'bad@example.com', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException)
    })
  })
  ```
- **Why it fails**: `AuthController` does not exist yet (cycle-040 must be done first).

## GREEN
- **Smallest change**: No additional production code — the `if (!user) throw new UnauthorizedException()` branch from cycle-040 covers this.
- **Files touched**: `src/auth/auth.controller.spec.ts` (test only)

## REFACTOR
none
