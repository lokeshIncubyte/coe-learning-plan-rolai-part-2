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
