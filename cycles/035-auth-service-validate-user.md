---
id: cycle-035
slug: auth-service-validate-user
status: pending
source: "AuthService.validateUser(email, password) — finds user by email, bcrypt.compare against hash, returns { id, email, role } or null"
covers: happy-path
group: auth-service
---

## Dependencies

### Prisma
Model: User
Required fields: email: string, passwordHash: string
Unique constraints: email
```
export type UserWhereUniqueInput = { id?: string; email?: string }
-- prisma.user.findUnique({ where: { email } }) returns User | null
-- User: { id: string; email: string; passwordHash: string; role: Role; createdAt: Date }
```

### Package
bcrypt@5.x (installed in cycle-034)
Resolved .d.ts: node_modules/@types/bcrypt/index.d.ts
Runtime keys: hash, hashSync, compare, compareSync, genSalt, genSaltSync, getRounds
Conflict: none
```
export function compare(data: string | Buffer, encrypted: string): Promise<boolean>
```

## Behavior
`AuthService.validateUser(email: string, password: string)` calls `prisma.user.findUnique({ where: { email } })`. If no user is found, returns `null`. If found, calls `bcrypt.compare(password, user.passwordHash)`. If compare returns `true`, returns `{ id, email, role }`. New service at `src/auth/auth.service.ts`.

## RED
- **Test file**: `src/auth/auth.service.spec.ts`
- **Assertion**:
  ```ts
  import * as bcrypt from 'bcrypt'
  import { AuthService } from './auth.service'

  jest.mock('bcrypt')

  describe('AuthService.validateUser — happy path', () => {
    it('returns { id, email, role } when user exists and password matches', async () => {
      const mockPrisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'admin@platform.com',
            passwordHash: '$2b$10$hashedpassword',
            role: 'ADMIN',
          }),
        },
      }
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      const service = new AuthService(mockPrisma as any, null as any)
      const result = await service.validateUser('admin@platform.com', 'login')
      expect(result).toEqual({ id: 'user-1', email: 'admin@platform.com', role: 'ADMIN' })
    })
  })
  ```
- **Why it fails**: `AuthService` does not exist at `src/auth/auth.service.ts`.

## GREEN
- **Smallest change**: Create `src/auth/auth.service.ts` with `@Injectable() AuthService` that injects `PrismaService` and `JwtService`. Implement `async validateUser(email: string, password: string): Promise<{ id: string; email: string; role: string } | null>`: call `prisma.user.findUnique({ where: { email } })`; if null return null; call `bcrypt.compare(password, user.passwordHash)`; if false return null; return `{ id: user.id, email: user.email, role: user.role }`.
- **Files touched**: `src/auth/auth.service.ts`

## REFACTOR
none
