import { UploadController } from './upload.controller';

describe('UploadController', () => {
  it('POST upload: processes file and returns summary', async () => {
    const mockSvc = {
      processUpload: jest.fn().mockResolvedValue('some text'),
      chunkIntoUnits: jest.fn().mockReturnValue(['chunk1']),
      extractAndPersist: jest.fn().mockResolvedValue({ entityCount: 1, edgeCount: 0, chunkCount: 1 }),
    };
    const ctrl = new UploadController(mockSvc as any);
    const file = { buffer: Buffer.from('some text'), mimetype: 'text/plain' } as Express.Multer.File;

    const result = await ctrl.upload(file);

    expect(mockSvc.processUpload).toHaveBeenCalledWith(file.buffer, file.mimetype);
    expect(result).toEqual({ entityCount: 1, edgeCount: 0, chunkCount: 1 });
  });
});
