---
id: cycle-036
slug: auth-service-validate-user-null
status: skip
source: "AuthService.validateUser — returns null when user not found or password wrong"
covers: error-path
group: auth-service
---

## Dependencies

### Prisma
Model: User
```
-- prisma.user.findUnique returns null when email not found
```

### Package
bcrypt@5.x (installed in cycle-034)
```
export function compare(data: string | Buffer, encrypted: string): Promise<boolean>
-- compare returns false when password does not match
```

## Behavior
`AuthService.validateUser` returns `null` in two cases: (1) `prisma.user.findUnique` returns `null` (user not found); (2) `bcrypt.compare` returns `false` (wrong password). Neither case throws — both silently return `null`.

## RED
- **Test file**: `src/auth/auth.service.spec.ts`
- **Assertion**:
  ```ts
  import * as bcrypt from 'bcrypt'
  import { AuthService } from './auth.service'

  jest.mock('bcrypt')

  describe('AuthService.validateUser — null paths', () => {
    it('returns null when user is not found', async () => {
      const mockPrisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } }
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
      const service = new AuthService(mockPrisma as any, null as any)
      const result = await service.validateUser('unknown@platform.com', 'login')
      expect(result).toBeNull()
    })

    it('returns null when password does not match', async () => {
      const mockPrisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'u1', email: 'user@platform.com', passwordHash: '$2b$10$hash', role: 'USER',
          }),
        },
      }
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
      const service = new AuthService(mockPrisma as any, null as any)
      const result = await service.validateUser('user@platform.com', 'wrongpassword')
      expect(result).toBeNull()
    })
  })
  ```
- **Why it fails**: `AuthService` does not exist yet (cycle-035 must be done first); once it does, the null-return logic must explicitly be present.

## GREEN
- **Smallest change**: No additional production code needed beyond cycle-035 — the validateUser implementation from cycle-035 already handles both null paths (early return when findUnique returns null; return null when bcrypt.compare returns false).
- **Files touched**: `src/auth/auth.service.spec.ts` (test only)

## REFACTOR
none
