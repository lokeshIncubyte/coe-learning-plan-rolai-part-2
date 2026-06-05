---
id: srv-022
slug: choice-generator-with-context
status: skip
source: "ChoiceGeneratorService.generateChoices(narrative, worldContext?) — accepts optional pre-formatted world context string, prepends it to the narrative before calling agent.generate"
covers: happy-path
---

## Behavior
`ChoiceGeneratorService.generateChoices()` gains an optional second parameter `worldContext: string`. When provided and non-empty, it is prepended to the narrative string (separated by a blank line) before passing to `agent.generate`. When omitted or empty, behaviour is unchanged.

## RED
- **Test file**: `src/agents/choice-generator.service.spec.ts`
- **Assertion**:
  ```ts
  // Add as a new describe block inside describe('ChoiceGeneratorService')

  describe('generateChoices with worldContext', () => {
    it('prepends worldContext to the narrative string passed to agent.generate', async () => {
      const agentMock = {
        generate: jest.fn().mockResolvedValue({
          object: { choices: [{ label: 'Run', entities: [], rules: [] }] },
        }),
      };
      const module = await Test.createTestingModule({
        providers: [
          ChoiceGeneratorService,
          { provide: 'CHOICE_GENERATOR_AGENT', useValue: agentMock },
        ],
      }).compile();
      const svc = module.get(ChoiceGeneratorService);

      await svc.generateChoices('The hero stood at the crossroads', 'WORLD:\n- TestChar (character)');

      expect(agentMock.generate).toHaveBeenCalledWith(
        'WORLD:\n- TestChar (character)\n\nThe hero stood at the crossroads',
        expect.objectContaining({ structuredOutput: expect.anything() }),
      );
    });
  });
  ```
- **Why it fails**: `generateChoices` currently accepts only `narrative`; the second argument is ignored and `agent.generate` is called with the bare narrative string.

## GREEN
- **Smallest change**: Change signature to `generateChoices(narrative: string, worldContext = '')`. When `worldContext` is non-empty, pass `` `${worldContext}\n\n${narrative}` `` to `agent.generate`.
- **Files touched**: `src/agents/choice-generator.service.ts`

## REFACTOR
none
