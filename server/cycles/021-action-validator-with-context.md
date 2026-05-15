---
id: cycle-021
slug: action-validator-with-context
status: skip
source: "ActionValidatorService.validate(action, ruleContext?) — accepts optional pre-formatted rule context string, prepends it to the action before calling agent.generate"
covers: happy-path
---

## Behavior
`ActionValidatorService.validate()` gains an optional second parameter `ruleContext: string`. When provided and non-empty, the service prepends it to the action string (separated by a blank line) before passing to `agent.generate`. When omitted or empty, behaviour is unchanged.

## RED
- **Test file**: `src/agents/action-validator.service.spec.ts`
- **Assertion**:
  ```ts
  // Add as a new describe block inside describe('ActionValidatorService')

  describe('validate with ruleContext', () => {
    it('prepends ruleContext to the action string passed to agent.generate', async () => {
      const agentMock = {
        generate: jest.fn().mockResolvedValueOnce({
          object: { result: 'accepted', reason: 'Fine.' },
        }),
      };
      const module = await Test.createTestingModule({
        providers: [
          ActionValidatorService,
          { provide: 'ACTION_VALIDATOR_AGENT', useValue: agentMock },
        ],
      }).compile();
      const svc = module.get(ActionValidatorService);

      await svc.validate('attack the guard', 'RULES:\n- No resurrections\n- Sunlight harms undead');

      expect(agentMock.generate).toHaveBeenCalledWith(
        'RULES:\n- No resurrections\n- Sunlight harms undead\n\nattack the guard',
        expect.objectContaining({ structuredOutput: expect.anything() }),
      );
    });
  });
  ```
- **Why it fails**: `validate` currently accepts only one parameter; the second argument is ignored and `agent.generate` is called with the bare action string.

## GREEN
- **Smallest change**: Change signature to `validate(action: string, ruleContext = '')`. When `ruleContext` is non-empty, pass `` `${ruleContext}\n\n${action}` `` to `agent.generate` instead of bare `action`.
- **Files touched**: `src/agents/action-validator.service.ts`

## REFACTOR
none
