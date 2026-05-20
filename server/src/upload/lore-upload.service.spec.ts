import { LoreUploadService } from './lore-upload.service';

describe('LoreUploadService', () => {
  let svc: LoreUploadService;
  beforeEach(() => { svc = new LoreUploadService({} as any, {} as any); });

  describe('processUpload', () => {
    it('returns buffer content as UTF-8 string for text/plain', async () => {
      const result = await svc.processUpload(Buffer.from('hello world'), 'text/plain');
      expect(result).toBe('hello world');
    });
  });
});
