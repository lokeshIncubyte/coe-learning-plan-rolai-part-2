---
id: cycle-019
slug: history-save-generation
status: done
source: "cycle-019 spec — GenerationHistoryService.saveGeneration calls prisma.generationHistory.create"
covers: happy-path
---

## Behavior
`GenerationHistoryService.saveGeneration(sessionId, narrative, anchor, deltas)` calls `prisma.generationHistory.create` with all four fields packaged under `data` and returns the created record. The service lives in `src/history/`. A `HistoryModule` (global) provides and exports it and imports `PrismaModule`.

## RED
- **Test file**: `src/history/generation-history.service.spec.ts`
- **Assertion**:
  ```ts
  import { GenerationHistoryService } from './generation-history.service';
  import { PrismaService } from '../prisma/prisma.service';

  const mockPrisma = {
    generationHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  describe('GenerationHistoryService', () => {
    let service: GenerationHistoryService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new GenerationHistoryService(mockPrisma);
    });

    describe('saveGeneration', () => {
      it('calls generationHistory.create with all four fields and returns the created record', async () => {
        const created = {
          id: 'h1',
          sessionId: 's1',
          narrative: 'Once upon a time...',
          anchor: 'beat-1',
          deltas: [],
        };
        (mockPrisma.generationHistory.create as jest.Mock).mockResolvedValueOnce(created);

        const result = await service.saveGeneration('s1', 'Once upon a time...', 'beat-1', []);

        expect(mockPrisma.generationHistory.create).toHaveBeenCalledWith({
          data: {
            sessionId: 's1',
            narrative: 'Once upon a time...',
            anchor: 'beat-1',
            deltas: [],
          },
        });
        expect(result).toEqual(created);
      });
    });
  });
  ```
- **Why it fails**: `src/history/generation-history.service.ts` does not exist, so the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `src/history/generation-history.service.ts` — `@Injectable()` class with a constructor parameter `private readonly prisma: PrismaService` and an `async saveGeneration(sessionId: string, narrative: string, anchor: string, deltas: unknown[])` method that returns `this.prisma.generationHistory.create({ data: { sessionId, narrative, anchor, deltas } })`. Create `src/history/history.module.ts` — `@Global()` `@Module` that imports `PrismaModule`, provides `GenerationHistoryService`, and exports `GenerationHistoryService`.
- **Files touched**: `src/history/generation-history.service.ts`, `src/history/history.module.ts`

## REFACTOR
none
