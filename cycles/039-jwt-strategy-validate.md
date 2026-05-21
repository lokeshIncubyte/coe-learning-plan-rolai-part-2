---
id: cycle-039
slug: jwt-strategy-validate
status: done
source: "JwtStrategy — Passport JWT strategy, validates token, attaches { id, email, role } to request"
covers: atomic
group: jwt-strategy
---

## Dependencies

### Package
@nestjs/passport@11.x (installed in cycle-034)
passport-jwt@4.x (installed in cycle-034)
Resolved .d.ts: node_modules/passport-jwt/lib/index.d.ts (after installation)
Runtime keys: Strategy, ExtractJwt
Conflict: none
```
-- passport-jwt Strategy: constructor(options, verify)
-- ExtractJwt.fromAuthHeaderAsBearerToken(): JwtFromRequestFunction
-- @nestjs/passport PassportStrategy(Strategy): class factory wrapping passport strategy
-- validate() method is called by Passport after token verification with decoded payload
```

**(none — pure logic cycle; PassportStrategy parent is mocked to isolate validate())**

## Behavior
`JwtStrategy.validate(payload)` maps `{ sub, email, role }` from the decoded JWT payload to `{ id: payload.sub, email: payload.email, role: payload.role }`. The strategy lives at `src/auth/jwt.strategy.ts` and extends `PassportStrategy(Strategy)`. The `validate()` method itself is pure logic.

## RED
- **Test file**: `src/auth/jwt.strategy.spec.ts`
- **Assertion**:
  ```ts
  jest.mock('@nestjs/passport', () => ({
    PassportStrategy: (_base: any) => class MockPassportBase { constructor() {} },
  }))

  import { JwtStrategy } from './jwt.strategy'

  describe('JwtStrategy.validate', () => {
    it('maps JWT payload to { id, email, role }', async () => {
      const strategy = new JwtStrategy()
      const result = await strategy.validate({ sub: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
      expect(result).toEqual({ id: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
    })
  })
  ```
- **Why it fails**: `JwtStrategy` does not exist at `src/auth/jwt.strategy.ts`.

## GREEN
- **Smallest change**: Create `src/auth/jwt.strategy.ts`:
  ```ts
  import { Injectable } from '@nestjs/common'
  import { PassportStrategy } from '@nestjs/passport'
  import { ExtractJwt, Strategy } from 'passport-jwt'
  @Injectable()
  export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
      super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env['JWT_SECRET'] ?? 'dev-secret' })
    }
    async validate(payload: { sub: string; email: string; role: string }) {
      return { id: payload.sub, email: payload.email, role: payload.role }
    }
  }
  ```
- **Files touched**: `src/auth/jwt.strategy.ts`

## REFACTOR
none
