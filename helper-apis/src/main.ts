import express from 'express';
import cors from 'cors';
import { handleEmbeddings } from './embeddings.handler';
import { handleChatCompletions } from './chat.handler';
import { warmModel } from './embedding-model';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/v1/models', (_req, res) => {
  res.json({
    object: 'list',
    data: [
      { id: 'claude-sonnet-4-6', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'sonnet', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'Xenova/all-MiniLM-L6-v2', object: 'model', created: 0, owned_by: 'xenova' },
    ],
  });
});

app.post('/v1/embeddings', handleEmbeddings);
app.post('/v1/chat/completions', handleChatCompletions);

const PORT = Number(process.env.PORT ?? 4000);

// Warm the embedding model in the background so first request is fast
warmModel();

app.listen(PORT, () => {
  console.log(`\nhelper-apis running on http://localhost:${PORT}/v1`);
  console.log('  POST /v1/chat/completions  → claude code headless');
  console.log('  POST /v1/embeddings        → local ONNX (all-MiniLM-L6-v2)');
  console.log('\nTo use instead of OpenRouter in the main server:');
  console.log('  baseURL: "http://localhost:4000/v1"');
  console.log('  model:   "sonnet" or "claude-sonnet-4-6"\n');
});
