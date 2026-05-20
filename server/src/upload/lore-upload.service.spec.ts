const mockGetText = jest.fn().mockResolvedValue({ text: 'extracted pdf text' });
const mockPdfParse = jest.fn().mockImplementation(() => ({ getText: mockGetText }));
jest.mock('pdf-parse', () => ({ PDFParse: mockPdfParse }));

import { LoreUploadService } from './lore-upload.service';

describe('LoreUploadService', () => {
  let svc: LoreUploadService;
  beforeEach(() => { svc = new LoreUploadService({} as any, {} as any); });

  describe('processUpload', () => {
    it('returns buffer content as UTF-8 string for text/plain', async () => {
      const result = await svc.processUpload(Buffer.from('hello world'), 'text/plain');
      expect(result).toBe('hello world');
    });

    it('extracts text from PDF buffer via pdf-parse', async () => {
      const buf = Buffer.from('%PDF-fake');
      const result = await svc.processUpload(buf, 'application/pdf');
      expect(mockPdfParse).toHaveBeenCalledWith({ data: buf });
      expect(mockGetText).toHaveBeenCalled();
      expect(result).toBe('extracted pdf text');
    });
  });

  describe('extractAndPersist', () => {
    it('calls extractDeltas + applyDeltas per chunk and returns aggregate counts', async () => {
      const mockExtractor = {
        extractDeltas: jest.fn().mockResolvedValue([{ op: 'new_entity', identity: { name: 'X', type: 'character' }, state: {} }]),
        applyDeltas: jest.fn().mockResolvedValue({ entityCount: 1, edgeCount: 0 }),
      };
      const mockHistory = { logUploadDeltas: jest.fn().mockResolvedValue(undefined) };
      const svc2 = new LoreUploadService(mockExtractor as any, mockHistory as any);

      const result = await svc2.extractAndPersist(['chunk one', 'chunk two']);

      expect(mockExtractor.extractDeltas).toHaveBeenCalledTimes(2);
      expect(mockExtractor.applyDeltas).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ entityCount: 2, edgeCount: 0, chunkCount: 2 });
    });

    it('logs all applied deltas to GenerationHistoryService after each chunk', async () => {
      const deltas = [{ op: 'new_entity', identity: { name: 'X', type: 'character' }, state: {} }];
      const mockExtractor = {
        extractDeltas: jest.fn().mockResolvedValue(deltas),
        applyDeltas: jest.fn().mockResolvedValue({ entityCount: 1, edgeCount: 0 }),
      };
      const mockHistory = { logUploadDeltas: jest.fn().mockResolvedValue(undefined) };
      const svc2 = new LoreUploadService(mockExtractor as any, mockHistory as any);

      await svc2.extractAndPersist(['one chunk']);

      expect(mockHistory.logUploadDeltas).toHaveBeenCalledWith(0, deltas);
    });
  });

  describe('chunkIntoUnits', () => {
    it('splits on double-newline, trims whitespace, filters empty segments', () => {
      const text = 'Elara is a mage.\n\nThe tavern is dark.\n\n  \n\nA sword lies on the table.';
      const chunks = svc.chunkIntoUnits(text);
      expect(chunks).toEqual([
        'Elara is a mage.',
        'The tavern is dark.',
        'A sword lies on the table.',
      ]);
    });

    it('preserves single newlines within a paragraph', () => {
      const text = 'Line one.\nLine two.\n\nParagraph two.';
      const chunks = svc.chunkIntoUnits(text);
      expect(chunks[0]).toBe('Line one.\nLine two.');
    });
  });
});
