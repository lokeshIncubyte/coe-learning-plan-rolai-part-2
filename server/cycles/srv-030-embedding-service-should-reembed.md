---
id: srv-030
slug: embedding-service-should-reembed
status: done
source: "Group B: EmbeddingService.shouldReembed — false on state-only change, true on identity shift"
covers: happy-path
group: embedding-service
---

## Behavior
`EmbeddingService.shouldReembed(before, after)` compares the five identity fields (name, type, archetype, backstory, role) on two entity snapshots. It returns `true` only when at least one of those fields differs, and `false` when only state, facts, or other non-identity fields change. This is the gate that prevents unnecessary re-embedding when world state mutates during gameplay.

## RED
- **Test file**: `src/generate/embedding.service.spec.ts`
- **Assertion**:
  ```ts
  describe('shouldReembed', () => {
    const base = {
      id: 'e1', name: 'Elara', type: 'character',
      archetype: 'Mage', backstory: 'Ancient sorcerer', role: 'protagonist',
      state: { health: 100 }, facts: { hometown: 'Ashwood' },
    };

    it('returns false when only state changes', () => {
      expect(service.shouldReembed(
        { ...base, state: { health: 100 } },
        { ...base, state: { health: 50, status: 'wounded' } },
      )).toBe(false);
    });

    it('returns false when only facts change', () => {
      expect(service.shouldReembed(
        { ...base, facts: { hometown: 'Ashwood' } },
        { ...base, facts: { hometown: 'Ashwood', guild: 'Mages' } },
      )).toBe(false);
    });

    it('returns true when archetype changes', () => {
      expect(service.shouldReembed(base, { ...base, archetype: 'Warrior' })).toBe(true);
    });

    it('returns true when role changes', () => {
      expect(service.shouldReembed(base, { ...base, role: 'antagonist' })).toBe(true);
    });

    it('returns true when name changes', () => {
      expect(service.shouldReembed(base, { ...base, name: 'Elena' })).toBe(true);
    });
  });
  ```
- **Why it fails**: `service.shouldReembed` is `undefined` — the method does not exist yet.

## GREEN
- **Smallest change**: Add `shouldReembed(before: Record<string, unknown>, after: Record<string, unknown>): boolean` to `EmbeddingService`. Check the five identity fields (`name`, `type`, `archetype`, `backstory`, `role`) with `Array.prototype.some`.
- **Files touched**: `src/generate/embedding.service.ts`

## REFACTOR
none
