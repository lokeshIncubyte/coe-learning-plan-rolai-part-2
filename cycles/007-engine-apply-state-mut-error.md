---
id: cycle-007
slug: engine-apply-state-mut-error
status: done
source: "Day 9: Engine graph-layer write fails when entity does not exist (Prisma P2025)"
covers: error-path
group: engine-apply-delta
---

## Dependencies

### Prisma
Model: Entity
Required fields (no `?`, no default): `type: string`, `name: string`
```
export type EntityCreateInput = {
  id?: string
  type: string
  name: string
  tags?: EntityCreatetagsInput | string[]
  facts?: JsonNullValueInput | InputJsonValue
  archetype?: string | null
  backstory?: string | null
  role?: string | null
  identity_version?: number
  state?: JsonNullValueInput | InputJsonValue
  last_beat?: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
  fromEdges?: EdgeCreateNestedManyWithoutFromInput
  toEdges?: EdgeCreateNestedManyWithoutToInput
}
```
`PrismaClientKnownRequestError` exported from `@prisma/client` (version 7.8.0). Code P2025 is thrown by `prisma.entity.update` when the record does not exist — this surfaces through `graphService.updateEntityState`'s transaction.

## Behavior
When `graphService.updateEntityState` propagates a `PrismaClientKnownRequestError`, `applyStateMutationDelta` lets it bubble up unchanged. No silent swallowing. The integration smoke for the engine-apply-delta group: run `processDeltas` (cycle-008) against a real `GraphService` backed by real Prisma with a seeded entity — verify state is updated in DB and the `identity_shift` delta is returned as `flaggedForReEmbed`.

## RED
- **Test file**: `server/src/generate/engine.service.spec.ts`
- **Assertion**:
  ```ts
  import { PrismaClientKnownRequestError } from '@prisma/client';

  describe('applyStateMutationDelta error path', () => {
    it('propagates PrismaClientKnownRequestError from graphService without swallowing', async () => {
      const err = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '7.8.0',
      });
      const mockGraph = { updateEntityState: jest.fn().mockRejectedValue(err) };
      const engine = new EngineService(mockGraph as any);
      const spec: UpdateSpec = { variables: {} };

      await expect(
        engine.applyStateMutationDelta('missing-id', { hp: 10 }, spec),
      ).rejects.toThrow(PrismaClientKnownRequestError);
    });
  });
  ```
- **Why it fails**: `applyStateMutationDelta` does not exist until cycle-006 GREEN is applied; once applied, the method does not catch errors so the rejection propagates naturally — this test passes as a structural validation of the absence of error-swallowing.

## GREEN
- **Smallest change**: No code change beyond cycle-006 GREEN — the method propagates rejections by default.
- **Files touched**: `server/src/generate/engine.service.ts` (no additional change)

## REFACTOR
none
