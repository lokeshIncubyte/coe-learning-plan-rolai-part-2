import { pipeline, env } from '@xenova/transformers';

env.cacheDir = './.cache/xenova';

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';

// Singleton per model name
const cache = new Map<string, ReturnType<typeof pipeline>>();

export function getExtractor(modelName = DEFAULT_MODEL) {
  if (!cache.has(modelName)) {
    console.log(`[embeddings] loading model ${modelName} (first call may take 10-30s)...`);
    cache.set(modelName, pipeline('feature-extraction', modelName));
  }
  return cache.get(modelName)!;
}

// Warm the default model at startup so first request is fast
export async function warmModel() {
  try {
    await getExtractor();
    console.log('[embeddings] model ready');
  } catch (err) {
    console.error('[embeddings] model load failed:', err);
  }
}
