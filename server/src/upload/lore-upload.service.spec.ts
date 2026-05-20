jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'extracted pdf text' }));

import pdfParse from 'pdf-parse';
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
      expect(pdfParse).toHaveBeenCalledWith(buf);
      expect(result).toBe('extracted pdf text');
    });
  });
});
