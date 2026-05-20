import { Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';

@Injectable()
export class LoreUploadService {
  constructor(private readonly extractorService: any, private readonly historyService: any) {}

  async processUpload(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    } else if (mimeType === 'application/pdf') {
      const { text } = await pdfParse(buffer);
      return text;
    }
    throw new Error(`Unsupported mimeType: ${mimeType}`);
  }

  chunkIntoUnits(text: string, maxChunkSize = 1500): string[] {
    return text.split('\n\n').map(s => s.trim()).filter(Boolean).map(s => s.slice(0, maxChunkSize));
  }
}
