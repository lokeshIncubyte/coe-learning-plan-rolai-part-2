---
id: cycle-012
slug: generate-controller-re-embed-fire-forget
status: done
source: "Wire flaggedForReEmbed in GenerateController — call embeddingService.embedEntityIdentity for each flagged identity-shift delta, fire-and-forget"
covers: happy-path
group: wire-flagged-re-embed
---

## Dependencies

### EmbeddingService (`src/generate/embedding.service.ts`)
```ts
@Injectable()
export class EmbeddingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async embedEntityIdentity(entityId: string): Promise<void> { /* ... */ }
  async onEntityWrite(before: Record<string, unknown>, after: Record<string, unknown>): Promise<void> { /* ... */ }
  async generateEmbedding(text: string): Promise<number[]> { /* ... */ }
  shouldReembed(before: Record<string, unknown>, after: Record<string, unknown>): boolean { /* ... */ }
  buildIdentityText(entity: { name: string; type: string; archetype?: string | null; backstory?: string | null; role?: string | null }): string { /* ... */ }
}
```

The test only uses `embedEntityIdentity(entityId: string): Promise<void>` — the rest of the class is mocked away.

## Behavior
When `engineService.processDeltas` returns `flaggedForReEmbed` containing one or more `IdentityShiftDelta`s, `GenerateController.generate` fires `embeddingService.embedEntityIdentity(delta.entityId)` for each without awaiting the results, so the HTTP response is not blocked. `EmbeddingService` must be added to the controller constructor. The mock call is recorded synchronously — no `setImmediate` flush needed.

Integration smoke: POST /api/generate with `deltas: [{ op: 'identity_shift', entityId: 'e1', patch: { archetype: 'Warrior' } }]` against a running server — confirm `EmbeddingService.embedEntityIdentity` is invoked (check NestJS log line or spy on the real instance).

## RED

- **Test file**: `src/generate/generate.controller.spec.ts`
- **Required import** (add to the top of the existing spec file before the new `it` block):
  ```ts
  import { EmbeddingService } from './embedding.service';
  ```
- **Assertion**:
  ```ts
  it('calls embeddingService.embedEntityIdentity for each flaggedForReEmbed delta', async () => {
    const embedEntityIdentity = jest.fn().mockResolvedValue(undefined);
    const processDeltas = jest.fn().mockResolvedValue({
      flaggedForReEmbed: [
        { op: 'identity_shift', entityId: 'e1', patch: { archetype: 'Warrior' } },
        { op: 'identity_shift', entityId: 'e2', patch: { role: 'villain' } },
      ],
    });
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: EngineService, useValue: { processDeltas } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity } },
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('story'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'approved' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockResolvedValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
      ],
    }).compile();

    await mod.get(GenerateController).generate({
      prompt: 'test',
      deltas: [{ op: 'identity_shift', entityId: 'e1', patch: { archetype: 'Warrior' } }],
    });

    expect(embedEntityIdentity).toHaveBeenCalledWith('e1');
    expect(embedEntityIdentity).toHaveBeenCalledWith('e2');
  });
  ```
- **Why it fails**: `GenerateController` does not inject `EmbeddingService` and does not read the return value of `processDeltas` — `embedEntityIdentity` is never called, so both `toHaveBeenCalledWith` assertions fail with "expected 1 call, received 0".

## GREEN

- **Smallest change**:
  1. Import `EmbeddingService` in `generate.controller.ts`.
  2. Add `private readonly embeddingService: EmbeddingService` to the constructor.
  3. Capture the return: `const { flaggedForReEmbed } = await this.engineService.processDeltas(body.deltas, defaultSpec);`
  4. Fire-and-forget: `for (const d of flaggedForReEmbed) { void this.embeddingService.embedEntityIdentity(d.entityId); }`
- **Files touched**: `src/generate/generate.controller.ts`

## REFACTOR
none
