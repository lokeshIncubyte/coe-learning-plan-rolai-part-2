import { EngineService } from './engine.service';
import type { UpdateSpec } from './update-spec';
import type { Delta } from '../upload/extractor.service';
import { Prisma } from '@prisma/client';
const { PrismaClientKnownRequestError } = Prisma;

const spec: UpdateSpec = {
  variables: {
    hp: { min: 0, max: 100 },
    stamina: { min: 0, max: 50 },
  },
};

const derivedSpec: UpdateSpec = {
  variables: {
    hp: {
      derived: { hpPct: { numerator: 'hp', denominator: 'maxHp', multiplier: 100 } },
    },
  },
};

const circularSpec: UpdateSpec = {
  variables: {},
  cascades: [
    { when: { key: 'x', op: '>', value: 0 }, apply: { x: 1 } },
  ],
};

const cascadeSpec: UpdateSpec = {
  variables: {},
  cascades: [
    { when: { key: 'hp', op: '<', value: 10 }, apply: { status: 'critical' } },
    { when: { key: 'hp', op: '>=', value: 80 }, apply: { status: 'healthy' } },
  ],
};

describe('EngineService', () => {
  describe('clampPatch', () => {
    it('clamps hp above max to 100, stamina below min to 0, passes unknown keys through', () => {
      const engine = new EngineService(null as any);
      const result = engine.clampPatch({ hp: 150, stamina: -10, gold: 999 }, spec);
      expect(result).toEqual({ hp: 100, stamina: 0, gold: 999 });
    });
  });

  describe('computeDerived', () => {
    it('adds hpPct = floor(hp / maxHp * 100) to the returned state', () => {
      const engine = new EngineService(null as any);
      const result = engine.computeDerived({ hp: 75, maxHp: 100 }, derivedSpec);
      expect(result).toMatchObject({ hp: 75, maxHp: 100, hpPct: 75 });
    });
  });

  describe('runCascades', () => {
    it('returns the apply patch for the matching cascade rule when hp < 10', () => {
      const engine = new EngineService(null as any);
      const cascades = engine.runCascades({ hp: 5, maxHp: 100 }, cascadeSpec);
      expect(cascades).toHaveLength(1);
      expect(cascades[0]).toEqual({ status: 'critical' });
    });
  });

  describe('runCascades depth limit', () => {
    it('returns [] when depth >= 5 without throwing', () => {
      const engine = new EngineService(null as any);
      const result = engine.runCascades({ x: 1 }, circularSpec, 5);
      expect(result).toEqual([]);
    });
  });

  describe('applyStateMutationDelta', () => {
    it('clamps patch and writes clamped values to graphService.updateEntityState', async () => {
      const mockGraph = {
        updateEntityState: jest.fn().mockResolvedValue({ id: 'e1', state: { hp: 100 } }),
      };
      const engine = new EngineService(mockGraph as any);
      const applySpec: UpdateSpec = { variables: { hp: { min: 0, max: 100 } } };

      const result = await engine.applyStateMutationDelta('e1', { hp: 150 }, applySpec);

      expect(mockGraph.updateEntityState).toHaveBeenCalledWith('e1', { hp: 100 });
      expect(result).toEqual({ resolved: { hp: 100 } });
    });
  });

  describe('applyStateMutationDelta error path', () => {
    it('propagates PrismaClientKnownRequestError from graphService without swallowing', async () => {
      const err = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '7.8.0',
      });
      const mockGraph = { updateEntityState: jest.fn().mockRejectedValue(err) };
      const engine = new EngineService(mockGraph as any);
      const errSpec: UpdateSpec = { variables: {} };

      await expect(
        engine.applyStateMutationDelta('missing-id', { hp: 10 }, errSpec),
      ).rejects.toThrow(PrismaClientKnownRequestError);
    });
  });

  describe('processDeltas', () => {
    it('writes state_mutation via graphService and returns identity_shift as flaggedForReEmbed', async () => {
      const mockGraph = {
        updateEntityState: jest.fn().mockResolvedValue({ id: 'e1', state: { hp: 80 } }),
      };
      const engine = new EngineService(mockGraph as any);
      const pdSpec: UpdateSpec = { variables: { hp: { min: 0, max: 100 } } };
      const pdDeltas: Delta[] = [
        { op: 'state_mutation', entityId: 'e1', patch: { hp: 80 } },
        { op: 'identity_shift', entityId: 'e2', patch: { archetype: 'Warrior' } },
      ];

      const result = await engine.processDeltas(pdDeltas, pdSpec);

      expect(mockGraph.updateEntityState).toHaveBeenCalledWith('e1', { hp: 80 });
      expect(mockGraph.updateEntityState).toHaveBeenCalledTimes(1);
      expect(result.flaggedForReEmbed).toHaveLength(1);
      expect(result.flaggedForReEmbed[0].entityId).toBe('e2');
    });
  });

  describe('classifyDeltas', () => {
    it('separates state_mutation and identity_shift; ignores new_entity and new_edge', () => {
      const engine = new EngineService(null as any);
      const deltas: Delta[] = [
        { op: 'state_mutation', entityId: 'e1', patch: { hp: 50 } },
        { op: 'identity_shift', entityId: 'e2', patch: { archetype: 'Warrior' } },
        { op: 'new_entity', identity: { name: 'X', type: 'item' }, state: {} },
        { op: 'new_edge', fromId: 'e1', toId: 'e2', type: 'ally' },
      ];
      const { stateMutations, identityShifts } = engine.classifyDeltas(deltas);
      expect(stateMutations).toHaveLength(1);
      expect(stateMutations[0].entityId).toBe('e1');
      expect(identityShifts).toHaveLength(1);
      expect(identityShifts[0].entityId).toBe('e2');
    });
  });
});
