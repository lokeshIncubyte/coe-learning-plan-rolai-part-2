import { Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import { ExtractorService } from './extractor.service';
import { GenerationHistoryService } from '../history/generation-history.service';

@Injectable()
export class LoreUploadService {
  constructor(private readonly extractorService: ExtractorService, private readonly historyService: GenerationHistoryService) {}

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

  async extractAndPersist(chunks: string[], anchorId?: string): Promise<{ entityCount: number; edgeCount: number; chunkCount: number }> {
    let entityCount = 0;
    let edgeCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const deltas = await this.extractorService.extractDeltas(chunks[i]);
      const counts = await this.extractorService.applyDeltas(deltas, anchorId);
      entityCount += counts.entityCount;
      edgeCount += counts.edgeCount;
      await this.historyService.logUploadDeltas?.(i, deltas);
    }

    return { entityCount, edgeCount, chunkCount: chunks.length };
  }
}
