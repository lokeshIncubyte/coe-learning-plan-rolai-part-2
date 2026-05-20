import { Injectable } from '@nestjs/common';

@Injectable()
export class LoreUploadService {
  constructor(private readonly extractorService: any, private readonly historyService: any) {}

  async processUpload(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    }
    throw new Error(`Unsupported mimeType: ${mimeType}`);
  }
}
