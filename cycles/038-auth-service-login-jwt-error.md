---
id: cycle-038
slug: auth-service-login-jwt-error
status: skip
source: "AuthService.login — propagates JwtService.sign error"
covers: error-path
group: auth-service
---

## Dependencies

### Package
@nestjs/jwt@11.x (installed in cycle-034)
```
sign(payload: string | object | Buffer, options?: JwtSignOptions): string
-- throws Error if JWT_SECRET is not configured or payload is invalid
```

## Behavior
When `JwtService.sign` throws (e.g. secret not configured), `AuthService.login` propagates the error — no try/catch around the sign call. This is the last cycle in the auth-service group. Integration smoke: `AuthService` with real `PrismaService` and real `JwtService` — `validateUser('admin@platform.com', 'login')` returns `{ id, email, role: 'ADMIN' }` (real bcrypt, real DB).

## RED
- **Test file**: `src/auth/auth.service.spec.ts`
- **Assertion**:
  ```ts
  import { AuthService } from './auth.service'

  describe('AuthService.login — error path', () => {
    it('propagates error when JwtService.sign throws', () => {
      const mockJwt = {
        sign: jest.fn().mockImplementation(() => { throw new Error('secretOrPrivateKey must have a value') }),
      }
      const service = new AuthService(null as any, mockJwt as any)
      expect(() => service.login({ id: 'u1', email: 'admin@platform.com', role: 'ADMIN' }))
        .toThrow('secretOrPrivateKey must have a value')
    })
  })
  ```
- **Why it fails**: `AuthService.login` does not exist yet (cycle-037 must be done first); once it does, natural propagation covers this without additional code.

## GREEN
- **Smallest change**: No production change needed — the login method from cycle-037 has no try/catch, so errors propagate naturally.
- **Files touched**: `src/auth/auth.service.spec.ts` (test only)

## REFACTOR
none
