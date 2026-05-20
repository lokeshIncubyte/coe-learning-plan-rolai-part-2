import { ExtractorService, type NewEntityDelta, type IdentityShiftDelta, type StateMutationDelta } from './extractor.service';

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

  describe('applyDeltas', () => {
    it('new_entity: calls createEntity then embedEntityIdentity', async () => {
      const mockGraph = { createEntity: jest.fn().mockResolvedValue({ id: 'e1' }), createEdge: jest.fn() };
      const mockEmbed = { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) };
      const svc2 = new ExtractorService({} as any, mockGraph as any, mockEmbed as any);

      const delta: NewEntityDelta = { op: 'new_entity', identity: { name: 'Elara', type: 'character' }, state: {} };
      const result = await svc2.applyDeltas([delta]);

      expect(mockGraph.createEntity).toHaveBeenCalledWith(expect.objectContaining({ name: 'Elara', type: 'character' }));
      expect(mockEmbed.embedEntityIdentity).toHaveBeenCalledWith('e1');
      expect(result.entityCount).toBe(1);
    });

    it('identity_shift: calls updateEntityIdentity with entityId and patch', async () => {
      const mockGraph = { createEntity: jest.fn(), createEdge: jest.fn(), updateEntityIdentity: jest.fn().mockResolvedValue({}) };
      const svc2 = new ExtractorService({} as any, mockGraph as any, {} as any);

      const delta: IdentityShiftDelta = { op: 'identity_shift', entityId: 'e1', patch: { archetype: 'Warrior' } };
      await svc2.applyDeltas([delta]);

      expect(mockGraph.updateEntityIdentity).toHaveBeenCalledWith('e1', { archetype: 'Warrior' });
    });

    it('state_mutation: calls updateEntityState with entityId and patch', async () => {
      const mockGraph = { createEntity: jest.fn(), createEdge: jest.fn(), updateEntityState: jest.fn().mockResolvedValue({}) };
      const svc2 = new ExtractorService({} as any, mockGraph as any, {} as any);

      const delta: StateMutationDelta = { op: 'state_mutation', entityId: 'e2', patch: { hp: 80 } };
      await svc2.applyDeltas([delta]);

      expect(mockGraph.updateEntityState).toHaveBeenCalledWith('e2', { hp: 80 });
    });
  });
});
