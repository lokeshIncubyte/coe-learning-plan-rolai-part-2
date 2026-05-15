---
id: cycle-011
slug: prisma-service
status: pending
source: "cycle-011 spec — PrismaService lifecycle, PrismaModule global export, GenerateModule import"
covers: happy-path
---

## Behavior
`PrismaService` extends `PrismaClient`, is `@Injectable()`, implements `OnModuleInit` (calls `$connect`) and `OnModuleDestroy` (calls `$disconnect`). A global `PrismaModule` exports it. `GenerateModule` imports `PrismaModule`.

## RED
- **Test file**: `src/prisma/prisma.service.spec.ts`
- **Assertion**:
  ```ts
  import { PrismaClient } from '@prisma/client';
  import { PrismaService } from './prisma.service';

  describe('PrismaService', () => {
    let service: PrismaService;

    beforeEach(() => {
      service = new PrismaService();
    });

    it('calls $connect on onModuleInit', async () => {
      const connectSpy = jest
        .spyOn(PrismaClient.prototype, '$connect')
        .mockResolvedValueOnce(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalledTimes(1);
      connectSpy.mockRestore();
    });

    it('calls $disconnect on onModuleDestroy', async () => {
      const disconnectSpy = jest
        .spyOn(PrismaClient.prototype, '$disconnect')
        .mockResolvedValueOnce(undefined);

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      disconnectSpy.mockRestore();
    });
  });
  ```
- **Why it fails**: `src/prisma/prisma.service.ts` does not exist, so the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `src/prisma/prisma.service.ts` that extends `PrismaClient`, adds `@Injectable()`, and implements `OnModuleInit` / `OnModuleDestroy` with `$connect` and `$disconnect` calls. Create `src/prisma/prisma.module.ts` as a `@Global()` `@Module` that provides and exports `PrismaService`. Update `src/generate/generate.module.ts` to add `PrismaModule` to its `imports` array.
- **Files touched**: `src/prisma/prisma.service.ts`, `src/prisma/prisma.module.ts`, `src/generate/generate.module.ts`

## REFACTOR
none
