---
id: cycle-037
slug: auth-service-login-access-token
status: pending
source: "AuthService.login(user) — returns { accessToken: string } signed with JWT"
covers: happy-path
group: auth-service
---

## Dependencies

### Package
@nestjs/jwt@11.x (installed in cycle-034)
Resolved .d.ts: node_modules/@nestjs/jwt/dist/jwt.service.d.ts (after installation)
Runtime keys: sign, verify, decode
Conflict: none
```
sign(payload: string | object | Buffer, options?: JwtSignOptions): string
-- synchronous — returns string, does not return Promise
```

## Behavior
`AuthService.login({ id, email, role })` calls `this.jwtService.sign({ sub: id, email, role })` and returns `{ accessToken: string }`. The method is synchronous (JwtService.sign returns a string, not a Promise).

## RED
- **Test file**: `src/auth/auth.service.spec.ts`
- **Assertion**:
  ```ts
  import { AuthService } from './auth.service'

  describe('AuthService.login', () => {
    it('returns { accessToken } from JwtService.sign', () => {
      const mockJwt = { sign: jest.fn().mockReturnValue('token.jwt.string') }
      const service = new AuthService(null as any, mockJwt as any)
      const result = service.login({ id: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
      expect(result).toEqual({ accessToken: 'token.jwt.string' })
      expect(mockJwt.sign).toHaveBeenCalledWith({ sub: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
    })
  })
  ```
- **Why it fails**: `AuthService.login` does not exist.

## GREEN
- **Smallest change**: Add `login(user: { id: string; email: string; role: string }): { accessToken: string }` to `AuthService` that calls `this.jwtService.sign({ sub: user.id, email: user.email, role: user.role })` and returns `{ accessToken }`.
- **Files touched**: `src/auth/auth.service.ts`

## REFACTOR
none
