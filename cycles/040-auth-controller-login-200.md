---
id: cycle-040
slug: auth-controller-login-200
status: pending
source: "POST /auth/login controller — takes { email, password }, calls validateUser, returns { accessToken } on success"
covers: happy-path
group: auth-controller
---

## Dependencies

**(none — controller test mocks AuthService via DI; boundary covered by auth-service group)**

## Behavior
`AuthController.login({ email, password })` calls `authService.validateUser(email, password)`. If the result is not null, calls `authService.login(user)` and returns `{ accessToken }`. Full controller cycle required because the method throws `UnauthorizedException` (exception-to-status mapping) when validateUser returns null.

## RED
- **Test file**: `src/auth/auth.controller.spec.ts`
- **Assertion**:
  ```ts
  import { Test, TestingModule } from '@nestjs/testing'
  import { AuthController } from './auth.controller'
  import { AuthService } from './auth.service'

  describe('AuthController POST /auth/login — 200', () => {
    it('returns { accessToken } when credentials are valid', async () => {
      const validateUser = jest.fn().mockResolvedValue({ id: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
      const login = jest.fn().mockReturnValue({ accessToken: 'token.jwt.string' })

      const module: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [{ provide: AuthService, useValue: { validateUser, login } }],
      }).compile()

      const controller = module.get(AuthController)
      const result = await controller.login({ email: 'admin@platform.com', password: 'login' })

      expect(validateUser).toHaveBeenCalledWith('admin@platform.com', 'login')
      expect(login).toHaveBeenCalledWith({ id: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
      expect(result).toEqual({ accessToken: 'token.jwt.string' })
    })
  })
  ```
- **Why it fails**: `AuthController` does not exist at `src/auth/auth.controller.ts`.

## GREEN
- **Smallest change**: Create `src/auth/auth.controller.ts` with `@Controller('auth') AuthController` injecting `AuthService`. Add `@Post('login') @HttpCode(HttpStatus.OK) async login(@Body() body: { email: string; password: string })`: call `validateUser`, if null throw `new UnauthorizedException()`, else call `login(user)` and return result. Create `src/auth/auth.module.ts` and register in `AppModule`.
- **Files touched**: `src/auth/auth.controller.ts`, `src/auth/auth.module.ts`, `src/app.module.ts`

## REFACTOR
none
