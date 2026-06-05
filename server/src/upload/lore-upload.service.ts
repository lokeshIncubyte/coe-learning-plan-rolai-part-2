import { BadRequestException, Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> } };
import { ExtractorService } from './extractor.service';
import { GenerationHistoryService } from '../history/generation-history.service';

@Injectable()
export class LoreUploadService {
  constructor(private readonly extractorService: ExtractorService, private readonly historyService: GenerationHistoryService) {}

  async processUpload(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    } else if (mimeType === 'application/pdf') {
      try {
        const parser = new PDFParse({ data: buffer });
        const { text } = await parser.getText();
        return text;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new BadRequestException(`PDF parse failed: ${msg}`);
      }
    }
    throw new Error(`Unsupported mimeType: ${mimeType}`);
  }

  chunkIntoUnits(text: string, maxChunkSize = 1500): string[] {
    return text.split('\n\n').map(s => s.trim()).filter(Boolean).map(s => s.slice(0, maxChunkSize));
  }

  async extractAndPersist(chunks: string[], anchorId?: string): Promise<{ entityCount: number; edgeCount: number; chunkCount: number }> {
    // Extract all chunks in parallel — each LLM call is independent.
    const deltasBatch = await Promise.all(chunks.map(c => this.extractorService.extractDeltas(c)));

    let entityCount = 0;
    let edgeCount = 0;

    for (let i = 0; i < deltasBatch.length; i++) {
      const counts = await this.extractorService.applyDeltas(deltasBatch[i], anchorId);
      entityCount += counts.entityCount;
      edgeCount += counts.edgeCount;
      await this.historyService.logUploadDeltas?.(i, deltasBatch[i]);
    }

    return { entityCount, edgeCount, chunkCount: chunks.length };
  }
}
