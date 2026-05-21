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

/**
 * Build extra system prompt instructions for structured output.
 * When response_format (json_schema/json_object) or tools are present,
 * inject a strict JSON instruction so Claude produces parseable output.
 */
function buildJsonInstruction(body: z.infer<typeof Body>): string {
  const rf = body.response_format as Record<string, unknown> | undefined;
  const tools = body.tools;
  const toolChoice = body.tool_choice as Record<string, unknown> | undefined;

  // tool_choice forcing a specific function → return a tool_calls array
  if (tools && tools.length > 0 && toolChoice && toolChoice.type === 'function') {
    const forcedName = (toolChoice.function as { name: string })?.name;
    const tool = tools.find(t => t.function.name === forcedName) ?? tools[0];
    return (
      `\n\nYou MUST respond with ONLY valid JSON in this exact format, no other text:\n` +
      `{"tool_calls":[{"type":"function","function":{"name":"${tool.function.name}","arguments":"<JSON string matching: ${JSON.stringify(tool.function.parameters)}>"}}]}\n` +
      `Replace <JSON string ...> with an actual JSON string (escaped) matching the parameters schema.`
    );
  }

  // json_schema response_format
  if (rf && rf['type'] === 'json_schema') {
    const schema = (rf['json_schema'] as Record<string, unknown>)?.['schema'];
    return `\n\nYou MUST respond with ONLY a valid JSON object matching this schema (no markdown, no explanation):\n${JSON.stringify(schema, null, 2)}`;
  }

  // json_object response_format
  if (rf && rf['type'] === 'json_object') {
    return '\n\nYou MUST respond with ONLY a valid JSON object (no markdown, no explanation).';
  }

  return '';
}

/** Extract JSON from a response that may contain markdown fences or extra text */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) return text.slice(firstBrace, lastBrace + 1);
  return text.trim();
}

function buildPrompt(messages: Message[], extraSystemInstruction: string): { systemPrompt: string | null; userPrompt: string } {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const convo = messages.filter(m => m.role !== 'system');
  const fullSystem = (system + extraSystemInstruction).trim() || null;

  // Single user message — pass directly
  if (convo.length === 1 && convo[0].role === 'user') {
    return { systemPrompt: fullSystem, userPrompt: convo[0].content };
  }

  // Multi-turn — flatten into Human/Assistant transcript
  const transcript = convo
    .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  return { systemPrompt: fullSystem, userPrompt: transcript };
}

function spawnClaude(extraArgs: string[], prompt: string) {
  const claudeBin = process.env.CLAUDE_PATH ?? 'claude';
  const args = [
    '--print',
    '--tools', '',
    '--permission-mode', 'bypassPermissions',
    ...extraArgs,
  ];

  const child = spawn(claudeBin, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env as NodeJS.ProcessEnv,
  });

  child.stdin.write(prompt, 'utf8');
  child.stdin.end();
  return child;
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
  const { systemPrompt, userPrompt } = buildPrompt(messages, jsonInstruction);
  const id = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);
  const needsJson = jsonInstruction.length > 0;

  // Strip provider prefix (e.g. "openai/sonnet" → "sonnet") before passing to claude CLI
  const claudeModel = model.includes('/') ? model.split('/').pop()! : model;
  const baseArgs = ['--model', claudeModel];
  if (systemPrompt) baseArgs.push('--system-prompt', systemPrompt);

  // ── Streaming ────────────────────────────────────────────────────────────
  // Claude CLI doesn't emit partial-message events reliably via --print,
  // so we run non-streaming, then chunk the full response for realistic SSE output.
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sse = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    const args = [...baseArgs, '--output-format', 'json'];
    const child = spawnClaude(args, userPrompt);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (c: Buffer) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c: Buffer) => { stderr += c.toString('utf8'); });

    child.on('close', code => {
      if (code !== 0) {
        console.error('[stream/claude] exit', code, 'stdout:', stdout.slice(0, 200), 'stderr:', stderr.slice(0, 200));
        sse({ id, object: 'chat.completion.chunk', created, model,
          choices: [{ index: 0, delta: { content: `[error: ${stderr.trim()}]` }, finish_reason: null }] });
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
      // Drip content in small chunks with a delay to simulate real token streaming
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

    // Kill child only if client disconnects before we finish
    res.on('close', () => { if (!res.writableEnded) child.kill(); });
    return;
  }

  // ── Non-streaming ────────────────────────────────────────────────────────
  const args = [...baseArgs, '--output-format', 'json'];

  return new Promise<void>(resolve => {
    const child = spawnClaude(args, userPrompt);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (c: Buffer) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c: Buffer) => { stderr += c.toString('utf8'); });

    child.on('close', code => {
      if (code !== 0) {
        console.error('[chat/claude] exit', code, stderr);
        res.status(500).json({
          error: { message: stderr.trim() || `claude exited with code ${code}`, type: 'server_error' },
        });
        resolve();
        return;
      }

      try {
        const result = JSON.parse(stdout);
        let content: string = result.result ?? '';
        const usage = result.usage ?? {};

        // For tool_calls responses, wrap in the expected format
        if (needsJson && body.tools && body.tools.length > 0 && body.tool_choice) {
          const jsonStr = extractJson(content);
          try {
            const parsed = JSON.parse(jsonStr);
            // If Claude returned tool_calls structure, surface it
            if (parsed.tool_calls) {
              // Ensure arguments are stringified if they came back as objects
              const normalised = parsed.tool_calls.map((tc: Record<string, unknown>) => {
                const fn = tc.function as Record<string, unknown>;
                if (fn && typeof fn.arguments !== 'string') {
                  fn.arguments = JSON.stringify(fn.arguments);
                }
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
            // Claude returned the function args directly — wrap them
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

        // For json_schema / json_object, strip markdown fences
        if (needsJson) content = extractJson(content);

        res.json({
          id,
          object: 'chat.completion',
          created,
          model,
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
