---
id: cycle-048
slug: narrative-generator-world-context
status: done
source: "Day 7 — NarrativeGeneratorService: worldContext parameter"
covers: happy-path
group: narrative-generator-world-context
---

## Behavior
`NarrativeGeneratorService.generate(prompt, worldContext?)` and `stream(prompt, signal?, worldContext?)` accept an optional `worldContext` string. When non-empty, a `WORLD CONTEXT` block is prepended to the system prompt instructing the model to ground the narrative in named entities. When `worldContext` is absent or empty (`''`), the system prompt is unchanged. Existing tests continue to pass because the parameter is optional with no default call-site impact.

## RED
- **Test file**: `src/generate/narrative-generator.service.spec.ts`
- **Assertion**:
  ```ts
  describe('worldContext injection', () => {
    it('includes WORLD CONTEXT block in system prompt when worldContext is provided', async () => {
      const module = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:4000'), getOrThrow: jest.fn().mockReturnValue('test') } },
        ],
      }).compile();
      const service = module.get(NarrativeGeneratorService);
      const createSpy = jest.spyOn((service as any).client.chat.completions, 'create')
        .mockResolvedValueOnce({ choices: [{ message: { content: 'narrative' } }] } as any);

      await service.generate('test prompt', 'WORLD:\n- Elara (character)');

      const call = createSpy.mock.calls[0][0] as any;
      const systemMsg = call.messages.find((m: any) => m.role === 'system');
      expect(systemMsg.content).toContain('Elara');
    });

    it('does NOT add WORLD CONTEXT when worldContext is empty', async () => {
      const module = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:4000'), getOrThrow: jest.fn().mockReturnValue('test') } },
        ],
      }).compile();
      const service = module.get(NarrativeGeneratorService);
      const createSpy = jest.spyOn((service as any).client.chat.completions, 'create')
        .mockResolvedValueOnce({ choices: [{ message: { content: 'narrative' } }] } as any);

      await service.generate('test prompt', '');

      const call = createSpy.mock.calls[0][0] as any;
      const systemMsg = call.messages.find((m: any) => m.role === 'system');
      expect(systemMsg.content).not.toContain('WORLD CONTEXT');
    });
  });
  ```
- **Why it fails**: `service.generate` only accepts one parameter; passing a second argument is ignored and the system prompt never contains the worldContext text.

## GREEN
- **Smallest change**: Add optional `worldContext?: string` as a second parameter to `generate(prompt, worldContext?)` and as a third parameter to `stream(prompt, signal?, worldContext?)`. Extract a private `buildSystemPrompt(worldContext?: string): string` method. When `worldContext` is non-empty after `.trim()`, append `\n\nWORLD CONTEXT — you MUST ground the narrative in the entities named below. Reuse their names verbatim; do not invent replacement characters or places when one is supplied here:\n${worldContext}\n` to the base prompt. Pass `worldContext` through to `buildSystemPrompt` in both `generate` and `stream`. Do NOT change the constructor — keep `config.getOrThrow('OPENROUTER_API_KEY')` and the existing `baseURL`; changing them would break the existing spec. Reference the worktree `narrative-generator.service.ts` only for the `buildSystemPrompt` / worldBlock logic.
- **Files touched**: `src/generate/narrative-generator.service.ts`

## REFACTOR
The `buildSystemPrompt` split into `basePrompt()` + worldBlock composition (as in the worktree) is already the clean form; no further refactor needed.
