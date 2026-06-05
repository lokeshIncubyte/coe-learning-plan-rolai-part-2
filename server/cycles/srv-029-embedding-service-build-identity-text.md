---
id: srv-029
slug: embedding-service-build-identity-text
status: done
source: "Group B: EmbeddingService.buildIdentityText joins identity fields with ' | ', omits nulls"
covers: happy-path
group: embedding-service
---

## Behavior
`EmbeddingService.buildIdentityText(entity)` returns a pipe-separated string of the entity's identity fields (name, type, archetype, backstory, role), omitting any that are null or undefined. This string is the sole input to the embedding model — state and facts fields are never included. The `EmbeddingService` class, its constructor (taking `PrismaService` and `ConfigService`), and the `src/generate/embedding.service.ts` file are all created in this cycle.

## RED
- **Test file**: `src/generate/embedding.service.spec.ts`
- **Assertion**:
  ```ts
  import { EmbeddingService } from './embedding.service';
  import { PrismaService } from '../prisma/prisma.service';
  import { ConfigService } from '@nestjs/config';

  jest.mock('openai', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      embeddings: { create: jest.fn() },
    })),
  }));

  const mockPrisma = {
    entity: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  } as unknown as PrismaService;

  const mockConfig = {
    get: jest.fn().mockReturnValue('http://localhost:4000'),
  } as unknown as ConfigService;

  describe('EmbeddingService', () => {
    let service: EmbeddingService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new EmbeddingService(mockPrisma, mockConfig);
    });

    describe('buildIdentityText', () => {
      it('joins name, type, archetype, backstory, role with pipe separator', () => {
        const result = service.buildIdentityText({
          name: 'TestChar', type: 'character', archetype: 'Mage',
          backstory: 'An ancient sorcerer', role: 'protagonist',
        });
        expect(result).toBe('TestChar | character | Mage | An ancient sorcerer | protagonist');
      });

      it('omits null and undefined identity fields', () => {
        const result = service.buildIdentityText({
          name: 'Stone', type: 'object', archetype: null,
          backstory: undefined, role: null,
        });
        expect(result).toBe('Stone | object');
      });

      it('does NOT include state or facts in the identity text', () => {
        const result = service.buildIdentityText({
          name: 'TestChar', type: 'character', archetype: 'Mage',
          backstory: null, role: null,
        });
        expect(result).not.toContain('health');
        expect(result).not.toContain('gold');
      });
    });
  });
  ```
- **Why it fails**: `src/generate/embedding.service.ts` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `src/generate/embedding.service.ts` with an `@Injectable() EmbeddingService` class. Constructor takes `PrismaService` and `ConfigService`; creates an OpenAI client pointed at `HELPER_APIS_URL` (defaults to `http://localhost:4000`). Add `buildIdentityText(entity)` that filters and joins the 5 identity fields with ` | `. No other methods yet.
- **Files touched**: `src/generate/embedding.service.ts`, `src/generate/embedding.service.spec.ts`

## REFACTOR
none
