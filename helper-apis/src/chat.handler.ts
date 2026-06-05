import { Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const ToolSchema = z.object({
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.unknown().optional(),
  }),
});

const Body = z.object({
  model: z.string().default('sonnet'),
  messages: z.array(MessageSchema).min(1),
  stream: z.boolean().optional().default(false),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  response_format: z.unknown().optional(),
  tools: z.array(ToolSchema).optional(),
  tool_choice: z.unknown().optional(),
});

type Message = z.infer<typeof MessageSchema>;

const CLAUDE_BIN = process.env.CLAUDE_PATH ?? 'claude';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

function spawnClaude(stdinContent: string) {
  const child = spawn(CLAUDE_BIN, [
    '--print', '--no-session-persistence', '--permission-mode', 'bypassPermissions',
    '--model', CLAUDE_MODEL,
    '--output-format', 'json',
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env as NodeJS.ProcessEnv,
  });
  // Write stdin immediately — must arrive within claude's 3s stdin timeout.
  child.stdin.write(stdinContent, 'utf8');
  child.stdin.end();
  return child;
}

function buildJsonInstruction(body: z.infer<typeof Body>): string {
  const rf = body.response_format as Record<string, unknown> | undefined;
  const tools = body.tools;
  const toolChoice = body.tool_choice as Record<string, unknown> | undefined;

  if (tools && tools.length > 0 && toolChoice && toolChoice.type === 'function') {
    const forcedName = (toolChoice.function as { name: string })?.name;
    const tool = tools.find(t => t.function.name === forcedName) ?? tools[0];
    return (
      `\n\nYou MUST respond with ONLY valid JSON in this exact format, no other text:\n` +
      `{"tool_calls":[{"type":"function","function":{"name":"${tool.function.name}","arguments":"<JSON string matching: ${JSON.stringify(tool.function.parameters)}>"}}]}\n` +
      `Replace <JSON string ...> with an actual JSON string (escaped) matching the parameters schema.`
    );
  }

  if (rf && rf['type'] === 'json_schema') {
    const schema = (rf['json_schema'] as Record<string, unknown>)?.['schema'];
    return `\n\nYou MUST respond with ONLY a valid JSON object matching this schema (no markdown, no explanation):\n${JSON.stringify(schema, null, 2)}`;
  }

  if (rf && rf['type'] === 'json_object') {
    return '\n\nYou MUST respond with ONLY a valid JSON object (no markdown, no explanation).';
  }

  return '';
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) return text.slice(firstBrace, lastBrace + 1);
  return text.trim();
}

function buildStdin(messages: Message[], extraSystemInstruction: string): string {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const convo = messages.filter(m => m.role !== 'system');
  const fullSystem = (system + extraSystemInstruction).trim();

  let userContent: string;
  if (convo.length === 1 && convo[0].role === 'user') {
    userContent = convo[0].content;
  } else {
    userContent = convo.map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`).join('\n\n');
  }

  if (fullSystem) {
    return `<system>\n${fullSystem}\n</system>\n\n${userContent}`;
  }
  return userContent;
}

export async function handleChatCompletions(req: Request, res: Response): Promise<void> {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: parsed.error.message, type: 'invalid_request_error' } });
    return;
  }

  const body = parsed.data;
  const { messages, model, stream } = body;
  const jsonInstruction = buildJsonInstruction(body);
  const stdinContent = buildStdin(messages, jsonInstruction);
  const id = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);
  const needsJson = jsonInstruction.length > 0;

  const t0 = Date.now();
  console.log(`[chat] ${stream ? 'stream' : 'non-stream'} — model: ${CLAUDE_MODEL}, messages: ${messages.length}`);

  // ── Streaming ─────────────────────────────────────────────────────────────
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sse = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    const child = spawnClaude(stdinContent);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (c: Buffer) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c: Buffer) => { stderr += c.toString('utf8'); });

    child.on('close', code => {
      console.log(`[chat/stream] claude exited ${code} in ${Date.now() - t0}ms`);
      if (code !== 0) {
        console.error('[stream/claude] exit', code, 'stderr:', stderr.slice(0, 300), 'stdout:', stdout.slice(0, 300));
        sse({ id, object: 'chat.completion.chunk', created, model,
          choices: [{ index: 0, delta: { content: `[error: ${stderr.trim() || `exit ${code}`}]` }, finish_reason: null }] });
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      let content = '';
      try {
        const result = JSON.parse(stdout);
        content = needsJson ? extractJson(result.result ?? '') : (result.result ?? '');
      } catch {
        // ignore parse error — still close cleanly
      }
      const chunkSize = 12;
      const intervalMs = 18;
      const chunks: string[] = [];
      for (let i = 0; i < content.length; i += chunkSize) chunks.push(content.slice(i, i + chunkSize));
      let idx = 0;
      const timer = setInterval(() => {
        if (idx < chunks.length) {
          sse({ id, object: 'chat.completion.chunk', created, model,
            choices: [{ index: 0, delta: { content: chunks[idx++] }, finish_reason: null }] });
        } else {
          clearInterval(timer);
          sse({ id, object: 'chat.completion.chunk', created, model,
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] });
          res.write('data: [DONE]\n\n');
          res.end();
        }
      }, intervalMs);
    });

    res.on('close', () => { if (!res.writableEnded) child.kill(); });
    return;
  }

  // ── Non-streaming ──────────────────────────────────────────────────────────
  return new Promise<void>(resolve => {
    const child = spawnClaude(stdinContent);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (c: Buffer) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c: Buffer) => { stderr += c.toString('utf8'); });

    child.on('close', code => {
      console.log(`[chat/non-stream] claude exited ${code} in ${Date.now() - t0}ms`);
      if (code !== 0) {
        console.error('[chat/claude] exit', code, 'stderr:', stderr.slice(0, 300), 'stdout:', stdout.slice(0, 300));
        res.status(500).json({
          error: { message: stderr.trim() || stdout.trim() || `claude exited with code ${code}`, type: 'server_error' },
        });
        resolve();
        return;
      }

      try {
        const result = JSON.parse(stdout);
        let content: string = result.result ?? '';
        const usage = result.usage ?? {};

        if (needsJson && body.tools && body.tools.length > 0 && body.tool_choice) {
          const jsonStr = extractJson(content);
          try {
            const parsedTool = JSON.parse(jsonStr);
            if (parsedTool.tool_calls) {
              const normalised = parsedTool.tool_calls.map((tc: Record<string, unknown>) => {
                const fn = tc.function as Record<string, unknown>;
                if (fn && typeof fn.arguments !== 'string') fn.arguments = JSON.stringify(fn.arguments);
                return { ...tc, type: 'function' };
              });
              res.json({
                id, object: 'chat.completion', created, model,
                choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: normalised }, finish_reason: 'tool_calls' }],
                usage: { prompt_tokens: usage.input_tokens ?? 0, completion_tokens: usage.output_tokens ?? 0, total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0) },
              });
              resolve();
              return;
            }
            const tool = body.tools![0];
            res.json({
              id, object: 'chat.completion', created, model,
              choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [{ type: 'function', function: { name: tool.function.name, arguments: jsonStr } }] }, finish_reason: 'tool_calls' }],
              usage: { prompt_tokens: usage.input_tokens ?? 0, completion_tokens: usage.output_tokens ?? 0, total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0) },
            });
            resolve();
            return;
          } catch {
            // fall through to plain content response
          }
        }

        if (needsJson) content = extractJson(content);

        res.json({
          id, object: 'chat.completion', created, model,
          choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
          usage: {
            prompt_tokens: usage.input_tokens ?? 0,
            completion_tokens: usage.output_tokens ?? 0,
            total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
          },
        });
      } catch {
        res.status(500).json({ error: { message: 'Failed to parse claude response', type: 'server_error' } });
      }
      resolve();
    });
  });
}
