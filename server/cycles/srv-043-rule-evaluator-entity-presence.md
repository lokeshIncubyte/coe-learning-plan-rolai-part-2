---
id: srv-043
slug: rule-evaluator-entity-presence
status: done
source: "Day 7 — RuleEvaluatorService: entity-presence trigger"
covers: happy-path
group: rule-evaluator
---

## Behavior
`RuleEvaluatorService.evaluateRules(reachedEntities, rules)` checks each rule entity's `facts.triggers` array. For an `entity-presence` trigger, the rule fires when the specified entity ID is found in `reachedEntities`. This cycle creates the service file, the exported types (`RuleFacts`, `RuleTrigger`, `RuleResult`), and the `evaluateRules` method with `entity-presence` handling via a private `isTriggerSatisfied` helper. Rules with null or malformed `facts` are silently skipped. An empty rules array returns an empty result.

## RED
- **Test file**: `src/generate/rule-evaluator.service.spec.ts`
- **Assertion**:
  ```ts
  import { RuleEvaluatorService } from './rule-evaluator.service';
  import type { EnrichedEntity } from './graph.service';
  import type { RuleFacts } from './rule-evaluator.service';

  function makeEntity(id: string, overrides: Partial<EnrichedEntity> = {}): EnrichedEntity {
    return { id, name: `Entity-${id}`, type: 'character', archetype: null, backstory: null,
             role: null, tags: [], facts: {}, state: {}, identity_version: 0,
             fromEdges: [], toEdges: [], ...overrides };
  }
  function makeRule(id: string, name: string, facts: RuleFacts): EnrichedEntity {
    return makeEntity(id, { name, type: 'rule', facts });
  }

  describe('RuleEvaluatorService', () => {
    let service: RuleEvaluatorService;
    beforeEach(() => { service = new RuleEvaluatorService(); });

    describe('entity-presence trigger', () => {
      it('fires when the entity ID is in the reached set', () => {
        const reached = [makeEntity('hero'), makeEntity('villain')];
        const rules = [makeRule('r1', 'Hero Rule', {
          triggers: [{ type: 'entity-presence', entityId: 'hero' }],
          outcome: 'allow combat', priority: 1,
        })];
        const results = service.evaluateRules(reached, rules);
        expect(results).toHaveLength(1);
        expect(results[0].ruleId).toBe('r1');
      });

      it('does NOT fire when the entity ID is absent from the reached set', () => {
        const reached = [makeEntity('hero')];
        const rules = [makeRule('r1', 'Villain Rule', {
          triggers: [{ type: 'entity-presence', entityId: 'villain' }],
          outcome: 'villain attacks', priority: 1,
        })];
        expect(service.evaluateRules(reached, rules)).toHaveLength(0);
      });

      it('returns empty array when no rules are defined', () => {
        expect(service.evaluateRules([makeEntity('hero')], [])).toEqual([]);
      });

      it('skips rules with null or malformed facts', () => {
        const badRule = makeEntity('bad', { name: 'Bad Rule', type: 'rule', facts: null });
        expect(service.evaluateRules([makeEntity('hero')], [badRule])).toHaveLength(0);
      });
    });
  });
  ```
- **Why it fails**: `src/generate/rule-evaluator.service.ts` does not exist — module-not-found error on import.

## GREEN
- **Smallest change**: Create `src/generate/rule-evaluator.service.ts`. Declare and export `RuleTrigger` (discriminated union with `entity-presence` member), `RuleFacts` (object with `triggers`, `outcome`, `priority`), and `RuleResult` (object with `ruleId`, `ruleName`, `outcome`, `priority`, `specificity`, `conflictsWith`). Add `@Injectable() RuleEvaluatorService` with a public `evaluateRules(reachedEntities, rules)` method that iterates rules, guards against null/non-array `facts.triggers`, calls `this.isTriggerSatisfied(trigger, reachedEntities)` for each trigger using AND logic, and pushes a `RuleResult` for each fully-satisfied rule. Implement `private isTriggerSatisfied` with `case 'entity-presence': return reachedEntities.some(e => e.id === trigger.entityId)` and `default: return false`. Return the results array directly (no sort yet).
- **Files touched**: `src/generate/rule-evaluator.service.ts`, `src/generate/rule-evaluator.service.spec.ts`

## REFACTOR
Extract `makeEntity` and `makeRule` test helpers into a shared `spec-helpers.ts` once the full rule-evaluator suite is stable.
