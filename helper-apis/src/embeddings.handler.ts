import { Request, Response } from 'express';
import { z } from 'zod';
import { getExtractor } from './embedding-model';
import { countTokensRough } from './tokens';

const Body = z.object({
  model: z.string().default('Xenova/all-MiniLM-L6-v2'),
  input: z.union([z.string(), z.array(z.string())]),
  encoding_format: z.enum(['float', 'base64']).optional(),
});

export async function handleEmbeddings(req: Request, res: Response) {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.message, type: 'invalid_request_error' } });
    return;
  }

  const { input, model, encoding_format } = parsed.data;
  const inputs = Array.isArray(input) ? input : [input];
  const useBase64 = encoding_format === 'base64';

  try {
    const extractor = await getExtractor(model);
    const data = await Promise.all(
      inputs.map(async (text, index) => {
        const output = await (extractor as any)(text, { pooling: 'mean', normalize: true });
        const floats = output.data as Float32Array;
        // OpenAI SDK v6 defaults to base64 encoding for performance — return binary float32 blob
        const embedding: string | number[] = useBase64
          ? Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength).toString('base64')
          : Array.from(floats);
        return {
          object: 'embedding' as const,
          index,
          embedding,
        };
      }),
    );

    const tokenCount = inputs.reduce((sum, t) => sum + countTokensRough(t), 0);

    res.json({
      object: 'list',
      data,
      model,
      usage: { prompt_tokens: tokenCount, total_tokens: tokenCount },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[embeddings] error:', message);
    res.status(500).json({ error: { message, type: 'server_error' } });
  }
}
