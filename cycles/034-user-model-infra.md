---
id: cycle-034
slug: user-model-infra
status: done
source: "Prisma User model — email (unique), passwordHash, role enum (ADMIN|USER); install auth packages; seed admin@platform.com and user@platform.com with password 'login'"
covers: atomic
group: user-model
---

## Dependencies

### Prisma
Model: User (to be created)
Required fields (no `?`, no default): email: string, passwordHash: string
Unique constraints: email
Enum: Role { ADMIN, USER }
```
-- Planned schema addition (not yet in schema.prisma):
-- enum Role { ADMIN USER }
-- model User {
--   id           String   @id @default(cuid())
--   email        String   @unique
--   passwordHash String
--   role         Role     @default(USER)
--   createdAt    DateTime @default(now())
-- }
-- After `npx prisma generate`, Prisma client will export:
-- export enum Role { ADMIN = 'ADMIN', USER = 'USER' }
-- export type UserCreateInput = { id?: string; email: string; passwordHash: string; role?: Role; createdAt?: Date | string }
```

### Package
bcrypt (to be installed: `npm install bcrypt @types/bcrypt @nestjs/jwt @nestjs/passport passport passport-jwt @types/passport-jwt`)
Resolved .d.ts: node_modules/@types/bcrypt/index.d.ts (after installation)
Runtime keys: hash, hashSync, compare, compareSync, genSalt, genSaltSync, getRounds
Conflict: none
```
export function hash(data: string, saltOrRounds: number | string): Promise<string>
export function compare(data: string | Buffer, encrypted: string): Promise<boolean>
```

## Behavior
Adds the `User` model and `Role` enum to `server/prisma/schema.prisma`, installs auth npm packages (bcrypt, @nestjs/jwt, @nestjs/passport, passport, passport-jwt and their @types), runs `prisma migrate dev --name add-user-model`, runs `prisma generate`, and creates a seed script at `server/prisma/seed.ts` that upserts admin@platform.com (ADMIN) and user@platform.com (USER) both with bcrypt-hashed password "login". Integration smoke: `prisma.user.findFirst({ where: { email: 'admin@platform.com' } })` returns a user with `role: 'ADMIN'`.

## RED
- **Test file**: `src/auth/user-model.spec.ts`
- **Assertion**:
  ```ts
  import { Role } from '@prisma/client'

  describe('User model infra', () => {
    it('Role enum has ADMIN and USER values', () => {
      expect(Role.ADMIN).toBe('ADMIN')
      expect(Role.USER).toBe('USER')
    })
  })
  ```
- **Why it fails**: `Role` is not exported from `@prisma/client` because the User model and Role enum do not exist in the schema yet — `Role` is `undefined`, so `Role.ADMIN` throws `TypeError`.

## GREEN
- **Smallest change**:
  1. `npm install bcrypt @types/bcrypt @nestjs/jwt @nestjs/passport passport passport-jwt @types/passport-jwt` (in `server/`)
  2. Add `enum Role { ADMIN USER }` and the User model to `server/prisma/schema.prisma`
  3. Run `npx prisma migrate dev --name add-user-model`
  4. Run `npx prisma generate`
  5. Create `server/prisma/seed.ts` that calls `bcrypt.hash('login', 10)` and `prisma.user.upsert` for both seeded emails
  6. Add `"prisma": { "seed": "ts-node prisma/seed.ts" }` to `server/package.json`
- **Files touched**: `server/prisma/schema.prisma`, `server/prisma/seed.ts`, `server/package.json`

## REFACTOR
none
