# Name-Based Delta Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace DB-ID-based delta fields (`entityId`, `fromId`, `toId`) with entity-name fields (`entityName`, `fromName`, `toName`) in the upload extraction pipeline so Mistral can emit `identity_shift`, `state_mutation`, and `new_edge` deltas that actually resolve to real graph nodes.

**Architecture:** Add optional name fields to the existing `IdentityShiftDelta`, `StateMutationDelta`, and `NewEdgeDelta` types (preserving backward-compat with the engine which still sends real IDs). Add `GraphService.findEntityByName()` to resolve names to IDs at persist time. Update `applyDeltas` to do a two-pass strategy: entities first, then relationships/mutations. Update the system prompt to use names.

**Tech Stack:** NestJS, Prisma, TypeScript, Jest

---

## File Map

| File | Change |
|---|---|
| `server/src/generate/graph.service.ts` | Add `findEntityByName(name)` |
| `server/src/generate/graph.service.spec.ts` | Tests for `findEntityByName` |
| `server/src/upload/extractor.service.ts` | Extend types + update system prompt + two-pass `applyDeltas` + `resolveEntityName` |
| `server/src/upload/extractor.service.spec.ts` | Tests for name resolution in all three delta types |

---

### Task 1: Add `GraphService.findEntityByName`

**Files:**
- Modify: `server/src/generate/graph.service.ts`
- Test: `server/src/generate/graph.service.spec.ts` (create if missing)

- [ ] **Step 1: Write the failing test**

Create or append to `server/src/generate/graph.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { GraphService } from './graph.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  entity: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  edge: { create: jest.fn() },
}

describe('GraphService.findEntityByName', () => {
  let service: GraphService

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        GraphService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = mod.get(GraphService)
    jest.clearAllMocks()
  })

  it('returns entity id when found', async () => {
    mockPrisma.entity.findFirst.mockResolvedValue({ id: 'abc-123' })
    const id = await service.findEntityByName('Castle Blackthorn')
    expect(id).toBe('abc-123')
    expect(mockPrisma.entity.findFirst).toHaveBeenCalledWith({
      where: { name: 'Castle Blackthorn' },
      select: { id: true },
    })
  })

  it('returns null when not found', async () => {
    mockPrisma.entity.findFirst.mockResolvedValue(null)
    const id = await service.findEntityByName('Unknown Entity')
    expect(id).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

```bash
cd server && npx jest graph.service.spec --no-coverage 2>&1 | tail -8
```
Expected: FAIL — `service.findEntityByName is not a function`

- [ ] **Step 3: Implement `findEntityByName` in `graph.service.ts`**

Add this method to the `GraphService` class (after `getEntitiesByTag`):

```typescript
async findEntityByName(name: string): Promise<string | null> {
  const entity = await this.prisma.entity.findFirst({
    where: { name },
    select: { id: true },
  });
  return entity?.id ?? null;
}
```

- [ ] **Step 4: Run test to confirm GREEN**

```bash
cd server && npx jest graph.service.spec --no-coverage 2>&1 | tail -8
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd server && git add src/generate/graph.service.ts src/generate/graph.service.spec.ts
git commit -m "feat: add GraphService.findEntityByName for name-based delta resolution"
```

---

### Task 2: Extend delta types with optional name fields

**Files:**
- Modify: `server/src/upload/extractor.service.ts` (lines 8–10, type definitions only)

- [ ] **Step 1: Write the failing test**

Append to `server/src/upload/extractor.service.spec.ts` (inside `describe('applyDeltas', ...)` or as a new describe block):

```typescript
describe('applyDeltas — name-based resolution', () => {
  it('identity_shift with entityName resolves name to id before patching', async () => {
    const mockGraph = {
      createEntity: jest.fn(),
      createEdge: jest.fn(),
      updateEntityIdentity: jest.fn().mockResolvedValue({}),
      updateEntityState: jest.fn(),
      findEntityByName: jest.fn().mockResolvedValue('resolved-id-1'),
    }
    const svc2 = new ExtractorService({} as any, mockGraph as any, {} as any)

    await svc2.applyDeltas([{ op: 'identity_shift', entityName: 'King Aldric', patch: { archetype: 'Tyrant' } }])

    expect(mockGraph.findEntityByName).toHaveBeenCalledWith('King Aldric')
    expect(mockGraph.updateEntityIdentity).toHaveBeenCalledWith('resolved-id-1', { archetype: 'Tyrant' })
  })

  it('state_mutation with entityName resolves name to id before patching', async () => {
    const mockGraph = {
      createEntity: jest.fn(),
      createEdge: jest.fn(),
      updateEntityState: jest.fn().mockResolvedValue({}),
      updateEntityIdentity: jest.fn(),
      findEntityByName: jest.fn().mockResolvedValue('resolved-id-2'),
    }
    const svc2 = new ExtractorService({} as any, mockGraph as any, {} as any)

    await svc2.applyDeltas([{ op: 'state_mutation', entityName: 'Castle Blackthorn', patch: { hp: 80 } }])

    expect(mockGraph.findEntityByName).toHaveBeenCalledWith('Castle Blackthorn')
    expect(mockGraph.updateEntityState).toHaveBeenCalledWith('resolved-id-2', { hp: 80 })
  })

  it('new_edge with fromName/toName resolves both names before creating edge', async () => {
    const mockGraph = {
      createEntity: jest.fn(),
      createEdge: jest.fn().mockResolvedValue({}),
      updateEntityIdentity: jest.fn(),
      updateEntityState: jest.fn(),
      findEntityByName: jest.fn()
        .mockResolvedValueOnce('from-id')
        .mockResolvedValueOnce('to-id'),
    }
    const svc2 = new ExtractorService({} as any, mockGraph as any, {} as any)

    const result = await svc2.applyDeltas([{
      op: 'new_edge', fromName: 'Mira', toName: 'Castle Blackthorn', type: 'visits', weight: 0.9,
    }])

    expect(mockGraph.findEntityByName).toHaveBeenCalledWith('Mira')
    expect(mockGraph.findEntityByName).toHaveBeenCalledWith('Castle Blackthorn')
    expect(mockGraph.createEdge).toHaveBeenCalledWith({
      fromId: 'from-id', toId: 'to-id', type: 'visits', weight: 0.9, tags: [],
    })
    expect(result.edgeCount).toBe(1)
  })

  it('new_edge skips silently when either name resolves to null', async () => {
    const mockGraph = {
      createEntity: jest.fn(),
      createEdge: jest.fn(),
      updateEntityIdentity: jest.fn(),
      updateEntityState: jest.fn(),
      findEntityByName: jest.fn().mockResolvedValue(null),
    }
    const svc2 = new ExtractorService({} as any, mockGraph as any, {} as any)

    const result = await svc2.applyDeltas([{
      op: 'new_edge', fromName: 'Nobody', toName: 'Castle Blackthorn', type: 'visits',
    }])

    expect(mockGraph.createEdge).not.toHaveBeenCalled()
    expect(result.edgeCount).toBe(0)
  })

  it('identity_shift skips silently when entityName resolves to null', async () => {
    const mockGraph = {
      createEntity: jest.fn(),
      createEdge: jest.fn(),
      updateEntityIdentity: jest.fn(),
      updateEntityState: jest.fn(),
      findEntityByName: jest.fn().mockResolvedValue(null),
    }
    const svc2 = new ExtractorService({} as any, mockGraph as any, {} as any)

    await svc2.applyDeltas([{ op: 'identity_shift', entityName: 'Ghost', patch: { archetype: 'X' } }])

    expect(mockGraph.updateEntityIdentity).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

```bash
cd server && npx jest extractor.service.spec --no-coverage 2>&1 | tail -10
```
Expected: FAIL — type errors and/or `entityName is not a property`

- [ ] **Step 3: Extend the delta types**

In `server/src/upload/extractor.service.ts`, replace lines 8–10:

```typescript
export type IdentityShiftDelta = {
  op: 'identity_shift';
  entityId?: string;
  entityName?: string;
  patch: Partial<{ name: string; type: string; archetype: string; backstory: string; role: string; sensoryProfile: string }>;
};
export type StateMutationDelta = {
  op: 'state_mutation';
  entityId?: string;
  entityName?: string;
  patch: Record<string, unknown>;
};
export type NewEdgeDelta = {
  op: 'new_edge';
  fromId?: string;
  toId?: string;
  fromName?: string;
  toName?: string;
  type: string;
  weight?: number;
  tags?: string[];
};
```

- [ ] **Step 4: Run tsc to check types compile**

```bash
cd server && npx tsc --noEmit 2>&1 | head -20
```
Expected: zero errors (engine service still uses `entityId` which is now optional — it was always present at runtime)

- [ ] **Step 5: Commit**

```bash
cd server && git add src/upload/extractor.service.ts src/upload/extractor.service.spec.ts
git commit -m "feat: extend delta types with optional entityName/fromName/toName fields"
```

---

### Task 3: Update `applyDeltas` with two-pass name resolution

**Files:**
- Modify: `server/src/upload/extractor.service.ts` — `applyDeltas` method + add `resolveEntityName` private method

- [ ] **Step 1: Implement two-pass `applyDeltas` and `resolveEntityName`**

Replace the entire `applyDeltas` method and add `resolveEntityName` in `extractor.service.ts`:

```typescript
private async resolveEntityName(name: string): Promise<string | null> {
  return this.graphService.findEntityByName(name);
}

async applyDeltas(deltas: Delta[], anchorId?: string): Promise<{ entityCount: number; edgeCount: number }> {
  let entityCount = 0;
  let edgeCount = 0;

  // Pass 1: create new entities first so name resolution works within the same chunk
  for (const delta of deltas) {
    if (delta.op !== 'new_entity') continue;
    const facts = { ...(delta.source ? { source: delta.source } : {}) };
    const { name, type, archetype, backstory, role, sensoryProfile } = delta.identity;
    const entity = await this.graphService.createEntity({ name, type, archetype, backstory, role, sensoryProfile, state: delta.state ?? {}, facts });
    await this.embeddingService?.embedEntityIdentity(entity.id);
    if (anchorId) {
      await this.graphService.createEdge({ fromId: anchorId, toId: entity.id, type: 'contains', weight: 1.0, tags: [] });
    }
    entityCount++;
  }

  // Pass 2: mutations and relationships — resolve names to IDs
  for (const delta of deltas) {
    if (delta.op === 'identity_shift') {
      const id = delta.entityId ?? (delta.entityName ? await this.resolveEntityName(delta.entityName) : null);
      if (!id) continue;
      await this.graphService.updateEntityIdentity(id, delta.patch);
    } else if (delta.op === 'state_mutation') {
      const id = delta.entityId ?? (delta.entityName ? await this.resolveEntityName(delta.entityName) : null);
      if (!id) continue;
      await this.graphService.updateEntityState(id, delta.patch);
    } else if (delta.op === 'new_edge') {
      try {
        const fromId = delta.fromId ?? (delta.fromName ? await this.resolveEntityName(delta.fromName) : null);
        const toId = delta.toId ?? (delta.toName ? await this.resolveEntityName(delta.toName) : null);
        if (!fromId || !toId) continue;
        await this.graphService.createEdge({ fromId, toId, type: delta.type, weight: delta.weight ?? 1.0, tags: delta.tags ?? [] });
        edgeCount++;
      } catch {
        // skip edges with invalid IDs
      }
    }
  }

  return { entityCount, edgeCount };
}
```

- [ ] **Step 2: Run tests to confirm GREEN**

```bash
cd server && npx jest extractor.service.spec --no-coverage 2>&1 | tail -10
```
Expected: all tests pass

- [ ] **Step 3: Run full test suite and tsc**

```bash
cd server && npx tsc --noEmit 2>&1 | head -10
cd server && npx jest --no-coverage 2>&1 | tail -10
```
Expected: no TypeScript errors, all tests pass

- [ ] **Step 4: Commit**

```bash
cd server && git add src/upload/extractor.service.ts
git commit -m "feat: two-pass applyDeltas with name-to-id resolution for upload deltas"
```

---

### Task 4: Update system prompt to use entity names

**Files:**
- Modify: `server/src/upload/extractor.service.ts` — `SYSTEM_PROMPT` constant

- [ ] **Step 1: Replace SYSTEM_PROMPT**

Replace the `SYSTEM_PROMPT` constant in `extractor.service.ts` with:

```typescript
const SYSTEM_PROMPT = `Extract entities and relationships from narrative text.

You MUST respond with ONLY a JSON object using this exact top-level key: { "deltas": [...] }

Each item in "deltas" is one of:
- { "op": "new_entity", "identity": { "name": "...", "type": "...", "archetype": "...", "backstory": "...", "role": "...", "sensoryProfile": "..." }, "state": { "hp": ..., "location": "...", "mood": "...", "status": "..." } }
- { "op": "identity_shift", "entityName": "<exact name of existing entity>", "patch": { "archetype": "...", "backstory": "...", "role": "..." } }
- { "op": "state_mutation", "entityName": "<exact name of existing entity>", "patch": { "hp": ..., "mood": "...", "status": "..." } }
- { "op": "new_edge", "fromName": "<exact name of entity>", "toName": "<exact name of entity>", "type": "...", "weight": 0.8 }

Example output:
{
  "deltas": [
    { "op": "new_entity", "identity": { "name": "Aldric", "type": "knight", "archetype": "protector", "backstory": "rose from poverty", "role": "guardian", "sensoryProfile": "auditory+tactile" }, "state": { "hp": 100, "location": "castle gates", "mood": "vigilant", "status": "active" } },
    { "op": "new_entity", "identity": { "name": "Ironkeep", "type": "location", "archetype": "fortress" }, "state": { "status": "occupied" } },
    { "op": "new_edge", "fromName": "Aldric", "toName": "Ironkeep", "type": "guards", "weight": 1.0 },
    { "op": "state_mutation", "entityName": "Aldric", "patch": { "mood": "weary" } }
  ]
}

Rules:
- ALWAYS use the "deltas" key at the top level — never use "entities", "result", or any other key.
- Identity fields (what it IS): name, type, archetype, backstory, role, sensoryProfile. These are stable and searchable.
- State fields (current condition): hp, location, mood, inventory, status. These are mutable.
- sensoryProfile for type: noble→visual, knight→auditory+tactile, peasant→balanced, child→visual+tactile, wildling→olfactory+auditory, scout→auditory+tactile, warg→olfactory.
- Use "new_entity" for any person, place, object, faction, or rule mentioned in the text that does not already exist.
- Use "identity_shift" to update WHO or WHAT an entity is (archetype, role, backstory change).
- Use "state_mutation" to update CURRENT CONDITION (hp, mood, location, status change).
- Use "new_edge" to capture a relationship between two entities — use their exact names.
- If nothing can be extracted, return: { "deltas": [] }`;
```

- [ ] **Step 2: Verify test for system prompt content still passes**

```bash
cd server && npx jest extractor.service.spec --no-coverage 2>&1 | tail -8
```
Expected: all tests pass (the system prompt test checks for `identity` and `state` keywords which are still present)

- [ ] **Step 3: Run tsc**

```bash
cd server && npx tsc --noEmit 2>&1 | head -5
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd server && git add src/upload/extractor.service.ts
git commit -m "feat: update extractor system prompt to use entity names instead of DB IDs"
```

---

## Self-Review

**Spec coverage:**
- ✓ `identity_shift` uses `entityName` → resolves to ID at persist time
- ✓ `state_mutation` uses `entityName` → resolves to ID at persist time
- ✓ `new_edge` uses `fromName`/`toName` → resolves both at persist time
- ✓ New entities created in pass-1 are resolvable by name in pass-2 within the same chunk
- ✓ Backward compat: engine still uses `entityId`/`fromId`/`toId` (now optional fields, always present at engine runtime)
- ✓ Null-safe: unresolved names are silently skipped (same behaviour as before for hallucinated IDs)

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:** `findEntityByName` used in Task 1 spec matches method added in Task 1 impl. `resolveEntityName` private method added in Task 3 is self-contained.
