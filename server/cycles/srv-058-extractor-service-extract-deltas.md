---
id: srv-058
slug: extractor-service-extract-deltas
status: done
source: "`extractDeltas(chunk)` — sends chunk to LLM with JSON mode; parses response into `Delta[]` using the schema"
covers: happy-path
---

## Behavior
`ExtractorService.extractDeltas` sends a narrative chunk to the LLM using `response_format: { type: 'json_object' }`, and parses the response into a `Delta[]`. Each delta has an `op` field typed as `'new_entity' | 'identity_shift' | 'state_mutation' | 'new_edge'`. The system prompt explicitly instructs the LLM to separate identity fields (`name`, `type`, `archetype`, `backstory`, `role`) from state fields. The `Delta` union type is exported from `extractor.service.ts`.

## RED
- **Test file**: `src/upload/extractor.service.spec.ts`
- **Assertion**:
  ```ts
  import { ExtractorService } from './extractor.service';

  const mockCreate = jest.fn();
  jest.mock('openai', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
  }));

  describe('ExtractorService', () => {
    let svc: ExtractorService;
    beforeEach(() => {
      jest.clearAllMocks();
      svc = new ExtractorService({} as any, {} as any);
    });

    describe('extractDeltas', () => {
      it('calls LLM with json_object response_format and returns parsed Delta[]', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({
            deltas: [{ op: 'new_entity', identity: { name: 'Elara', type: 'character' }, state: {} }]
          }) } }],
        });

        const result = await svc.extractDeltas('Elara is an ancient mage.');

        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
          response_format: { type: 'json_object' },
        }));
        expect(result).toHaveLength(1);
        expect(result[0].op).toBe('new_entity');
      });

      it('system prompt separates identity fields from state fields', async () => {
        mockCreate.mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ deltas: [] }) } }],
        });
        await svc.extractDeltas('some chunk');
        const call = mockCreate.mock.calls[0][0];
        const systemMsg = call.messages.find((m: any) => m.role === 'system').content;
        expect(systemMsg).toMatch(/identity/i);
        expect(systemMsg).toMatch(/state/i);
      });
    });
  });
  ```
- **Why it fails**: `ExtractorService` does not exist.

## GREEN
- **Smallest change**: Create `src/upload/extractor.service.ts` exporting the `Delta` union type and `ExtractorService` with `extractDeltas(chunk: string): Promise<Delta[]>`. Constructor takes `ConfigService` (for `HELPER_APIS_URL`) and `GraphService`. Use OpenAI SDK with `json_object` response_format. System prompt instructs LLM to return `{ deltas: Delta[] }` with identity and state as separate keys on `new_entity`.
- **Files touched**: `src/upload/extractor.service.ts`

## REFACTOR
none

## Merge
Squash-merge this cycle's branch to `main` and delete it before starting the next cycle:
```bash
git checkout main
git merge --squash tdd/extractor-service-extract-deltas
git commit -m "feat(srv-058): <summary>"
git branch -D tdd/extractor-service-extract-deltas
```
