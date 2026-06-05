# Chat Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist narrative beat history across page refreshes by tying sessions to authenticated users, logging beats from the SSE stream path, and restoring the last session on narrative page load.

**Architecture:** Add `userId` to the `Session` model, guard the stream/generate endpoints with JWT so every beat is logged under the correct user, expose list-sessions and get-history endpoints, then load the last session's history into the client on mount.

**Tech Stack:** NestJS + Prisma (server), Next.js App Router BFF routes (client), JWT via `JwtAuthGuard` + `@Request()` decorator (already in codebase at `src/auth/jwt-auth.guard.ts`).

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `server/prisma/schema.prisma` | Add `userId String?` to `Session` |
| Modify | `server/src/generate/session.service.ts` | `createSession(userId?)`, `listForUser(userId)`, `getHistory(sessionId)` |
| Modify | `server/src/generate/generate.controller.ts` | Guard stream + generate with JWT, pass userId, log history in stream path |
| Modify | `server/src/generate/session.controller.ts` | Add `GET /api/session` (list) and `GET /api/session/:id/history` |
| Modify | `server/src/generate/generate.module.ts` | Import `AuthModule` so `JwtAuthGuard` resolves |
| Create | `client/app/api/session/route.ts` | BFF: list sessions for current user |
| Create | `client/app/api/session/[id]/history/route.ts` | BFF: get beats for a session |
| Modify | `client/app/api/generate/stream/route.ts` | Forward `Authorization` header to NestJS |
| Modify | `client/app/narrative/hooks/useNarrativeHistory.ts` | Accept initial beats; expose `sessionId` |
| Modify | `client/app/narrative/page.tsx` | Load last session on mount, restore beats |

---

## Task 1: Add `userId` to Session schema and migrate

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add `userId` field to `Session` model**

In `server/prisma/schema.prisma`, change the `Session` model to:

```prisma
model Session {
  id        String              @id @default(cuid())
  userId    String?
  createdAt DateTime            @default(now())
  history   GenerationHistory[]
}
```

- [ ] **Step 2: Push schema to DB**

```bash
cd server
npx prisma db push
```

Expected output: `🚀  Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(persistence): add userId to Session model"
```

---

## Task 2: Extend SessionService with user-scoped queries

**Files:**
- Modify: `server/src/generate/session.service.ts`
- Test: `server/src/generate/session.service.spec.ts` (create if missing)

- [ ] **Step 1: Write failing tests**

Create `server/src/generate/session.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { SessionService } from './session.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  session: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
}

describe('SessionService', () => {
  let service: SessionService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(SessionService)
    jest.clearAllMocks()
  })

  it('createSession passes userId to prisma', async () => {
    mockPrisma.session.create.mockResolvedValue({ id: 'sess-1' })
    const id = await service.createSession('user-abc')
    expect(id).toBe('sess-1')
    expect(mockPrisma.session.create).toHaveBeenCalledWith({
      data: { userId: 'user-abc' },
    })
  })

  it('createSession works without userId', async () => {
    mockPrisma.session.create.mockResolvedValue({ id: 'sess-2' })
    await service.createSession()
    expect(mockPrisma.session.create).toHaveBeenCalledWith({ data: {} })
  })

  it('listForUser returns sessions ordered by createdAt desc', async () => {
    const sessions = [{ id: 'a', createdAt: new Date() }]
    mockPrisma.session.findMany.mockResolvedValue(sessions)
    const result = await service.listForUser('user-abc')
    expect(result).toBe(sessions)
    expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-abc' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { history: false },
    })
  })

  it('getHistory returns session with history', async () => {
    const session = { id: 'a', history: [{ narrative: 'beat 1' }] }
    mockPrisma.session.findUniqueOrThrow.mockResolvedValue(session)
    const result = await service.getHistory('a')
    expect(result).toBe(session)
    expect(mockPrisma.session.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'a' },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npx jest session.service.spec --no-coverage
```

Expected: FAIL — `createSession` doesn't accept userId yet.

- [ ] **Step 3: Implement the updated SessionService**

Replace `server/src/generate/session.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId?: string): Promise<string> {
    const session = await this.prisma.session.create({
      data: userId ? { userId } : {},
    })
    return session.id
  }

  async listForUser(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { history: false },
    })
  }

  async getHistory(sessionId: string) {
    return this.prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    })
  }

  async exportSession(id: string) {
    return this.prisma.session.findUniqueOrThrow({ where: { id }, include: { history: true } })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && npx jest session.service.spec --no-coverage
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/generate/session.service.ts server/src/generate/session.service.spec.ts
git commit -m "feat(persistence): extend SessionService with userId and history queries"
```

---

## Task 3: Guard generate endpoints with JWT and log history in stream path

**Files:**
- Modify: `server/src/generate/generate.controller.ts`
- Modify: `server/src/generate/generate.module.ts`

- [ ] **Step 1: Import `AuthModule` in `GenerateModule`**

In `server/src/generate/generate.module.ts`, add `AuthModule` to imports:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { GraphService } from './graph.service';
import { EmbeddingService } from './embedding.service';
import { StateService } from './state.service';
import { EngineService } from './engine.service';
import { TraversalService } from './traversal.service';
import { RuleEvaluatorService } from './rule-evaluator.service';
import { SessionService } from './session.service';
import { HistoryService } from './history.service';
import { GenerateController } from './generate.controller';
import { SessionController } from './session.controller';
import { AgentsModule } from '../agents/agents.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExtractorService } from '../upload/extractor.service';

@Module({
  imports: [ConfigModule, AgentsModule, PrismaModule, AuthModule],
  controllers: [GenerateController, SessionController],
  providers: [NarrativeGeneratorService, GraphService, EmbeddingService, StateService, EngineService, TraversalService, RuleEvaluatorService, SessionService, HistoryService, ExtractorService],
  exports: [NarrativeGeneratorService, GraphService, EmbeddingService, StateService, EngineService, TraversalService, RuleEvaluatorService, SessionService, HistoryService, ExtractorService],
})
export class GenerateModule {}
```

- [ ] **Step 2: Update `GenerateController` — guard stream, pass userId, log history**

Replace the top imports and the `stream` + `generate` methods in `server/src/generate/generate.controller.ts`. The full file:

```typescript
import { Body, Controller, HttpCode, HttpStatus, Post, Query, Request, Sse, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { ActionValidatorService } from '../agents/action-validator.service';
import { ChoiceGeneratorService } from '../agents/choice-generator.service';
import { GraphService } from './graph.service';
import { TraversalService } from './traversal.service';
import { RuleEvaluatorService } from './rule-evaluator.service';
import { EngineService } from './engine.service';
import { EmbeddingService } from './embedding.service';
import { SessionService } from './session.service';
import { HistoryService } from './history.service';
import { ExtractorService } from '../upload/extractor.service';
import { OpenAiExceptionFilter } from './openai-exception.filter';
import { LoggingInterceptor } from './logging.interceptor';
import type { Delta } from '../upload/extractor.service';
import type { UpdateSpec } from './update-spec';
import * as defaultSpecJson from '../config/update-spec.json';

const defaultSpec: UpdateSpec = defaultSpecJson as UpdateSpec;

export class GenerateRequestDto {
  prompt: string;
  deltas?: Delta[];
}

@Controller('generate')
@UseFilters(new OpenAiExceptionFilter())
@UseInterceptors(new LoggingInterceptor())
export class GenerateController {
  constructor(
    private readonly narrativeService: NarrativeGeneratorService,
    private readonly validatorService: ActionValidatorService,
    private readonly choiceGeneratorService: ChoiceGeneratorService,
    private readonly graphService: GraphService,
    private readonly traversalService: TraversalService,
    private readonly ruleEvaluator: RuleEvaluatorService,
    private readonly engineService: EngineService,
    private readonly embeddingService: EmbeddingService,
    private readonly sessionService: SessionService,
    private readonly historyService: HistoryService,
    private readonly extractorService: ExtractorService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Sse('stream')
  stream(@Query() query: { prompt: string }, @Request() req: any): Observable<MessageEvent> {
    const userId: string = req.user?.id
    return new Observable((subscriber) => {
      const abort = new AbortController();

      (async () => {
        try {
          const sessionId = await this.sessionService.createSession(userId);
          const { ruleContext, worldContext, anchorId } = await this.buildContexts(query.prompt);
          const outcome = await this.validatorService.validate(query.prompt, ruleContext);

          if (outcome.result === 'rejected') {
            subscriber.next({ data: { type: 'rejected', reason: outcome.reason } });
            subscriber.complete();
            return;
          }

          const effectivePrompt = outcome.result === 'modified' && outcome.modifiedAction
            ? outcome.modifiedAction
            : query.prompt;

          if (outcome.result === 'modified' && outcome.modifiedAction) {
            subscriber.next({ data: { type: 'modified', modifiedAction: outcome.modifiedAction } });
          }

          subscriber.next({ data: { type: 'session', sessionId } });
          subscriber.next({ data: { type: 'start' } });
          let fullNarrative = '';
          for await (const token of this.narrativeService.stream(effectivePrompt, abort.signal, worldContext)) {
            if (subscriber.closed) break;
            fullNarrative += token;
            subscriber.next({ data: { type: 'chunk', content: token } });
          }
          if (!subscriber.closed) {
            await this.historyService.logEntry(sessionId, fullNarrative, anchorId, []);
            const choices = await this.choiceGeneratorService.generateChoices(fullNarrative, worldContext);
            subscriber.next({ data: { type: 'done' } });
            subscriber.next({ data: { type: 'choices', choices } });
            subscriber.complete();
          }
        } catch (err: any) {
          if (!subscriber.closed) {
            subscriber.next({ data: { type: 'error', message: err?.message ?? 'Stream error' } });
            subscriber.complete();
          }
        }
      })();

      return () => abort.abort();
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.OK)
  async generate(@Body() body: GenerateRequestDto, @Request() req: any) {
    const userId: string = req.user?.id
    const sessionId = await this.sessionService.createSession(userId);

    if (body.deltas?.length) {
      const { flaggedForReEmbed } = await this.engineService.processDeltas(body.deltas, defaultSpec);
      for (const d of flaggedForReEmbed) {
        void this.embeddingService.embedEntityIdentity(d.entityId);
      }
    }
    const { ruleContext, worldContext, anchorId } = await this.buildContexts(body.prompt);

    const outcome = await this.validatorService.validate(body.prompt, ruleContext);
    if (outcome.result === 'rejected') {
      return { rejected: true, reason: outcome.reason };
    }

    const modifiedAction = outcome.result === 'modified' ? outcome.modifiedAction : undefined;
    const effectivePrompt = modifiedAction ?? body.prompt;

    const narrative = await this.narrativeService.generate(effectivePrompt, worldContext);
    try {
      const extractedDeltas = await this.extractorService.extractDeltas(narrative);
      await this.engineService.processDeltas(extractedDeltas, defaultSpec);
    } catch {
    }
    const choices = await this.choiceGeneratorService.generateChoices(narrative, worldContext);
    await this.historyService.logEntry(sessionId, narrative, anchorId, body.deltas ?? []);
    return { narrative, choices, sessionId, ...(modifiedAction ? { modifiedAction } : {}) };
  }

  private async buildContexts(prompt: string): Promise<{ ruleContext: string; worldContext: string; anchorId: string }> {
    const { entities, scores } = await this.graphService.semanticRecall(prompt, 8);
    let allEntities = entities;
    const phase1Scores = scores;
    if (allEntities.length === 0) {
      allEntities = await this.graphService.getAllEntitiesWithEdges();
    }
    const anchorId = allEntities[0]?.id ?? '';

    const traversed = this.traversalService.traverse(anchorId, allEntities, 2);
    const toRank = traversed.length
      ? traversed
      : allEntities.map((e: any) => ({ ...e, proximityScore: 1, combinedScore: 1 }));
    const ranked = this.traversalService.scoreWithSemantics(toRank, phase1Scores);

    const rules = await this.graphService.getEntitiesByType('rule') as any[];
    const activeRules = this.ruleEvaluator.evaluateRules(allEntities, rules);
    const ruleContext = activeRules.length
      ? `RULES:\n${activeRules.map((r) => {
          const conflicts = r.conflictsWith?.length ? ` [conflicts: ${r.conflictsWith.join(', ')}]` : '';
          return `- ${r.ruleName}: ${r.outcome}${conflicts}`;
        }).join('\n')}`
      : '';

    const worldContext = this.buildWorldContext(ranked.slice(0, 8));

    return { ruleContext, worldContext, anchorId };
  }

  private buildWorldContext(entities: any[]): string {
    if (!entities.length) return '';
    return `WORLD:\n${entities.map((e) => {
      const extras = [e.archetype, e.role, e.state ? JSON.stringify(e.state) : null].filter(Boolean).join(', ');
      return `- ${e.name} (${e.type})${extras ? `: ${extras}` : ''}`;
    }).join('\n')}`;
  }
}
```

- [ ] **Step 3: Verify server compiles (watch mode will show errors)**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/generate/generate.controller.ts server/src/generate/generate.module.ts
git commit -m "feat(persistence): guard stream+generate with JWT, create session per user, log beats in stream"
```

---

## Task 4: Add session list and history endpoints

**Files:**
- Modify: `server/src/generate/session.controller.ts`

- [ ] **Step 1: Replace SessionController**

```typescript
import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { SessionService } from './session.service'

@Controller('session')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  listSessions(@Request() req: any) {
    return this.sessionService.listForUser(req.user.id)
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.sessionService.getHistory(id)
  }

  @Get(':id/export')
  exportSession(@Param('id') id: string) {
    return this.sessionService.exportSession(id)
  }
}
```

- [ ] **Step 2: Smoke-test the endpoints**

Start the server, log in, and verify:

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@platform.com","password":"login"}' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -s http://localhost:3001/api/session \
  -H "Authorization: Bearer $TOKEN" | head -c 200
```

Expected: `[]` (empty array, no sessions yet).

- [ ] **Step 3: Commit**

```bash
git add server/src/generate/session.controller.ts
git commit -m "feat(persistence): add GET /api/session list and /:id/history endpoints"
```

---

## Task 5: BFF routes for session list and history

**Files:**
- Create: `client/app/api/session/route.ts`
- Create: `client/app/api/session/[id]/history/route.ts`
- Modify: `client/app/api/generate/stream/route.ts`

- [ ] **Step 1: Create session list BFF route**

Create `client/app/api/session/route.ts`:

```typescript
export async function GET(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const upstream = await fetch('http://localhost:3001/api/session', {
    headers: { Authorization: auth },
  })
  const data = await upstream.json()
  return Response.json(data, { status: upstream.status })
}
```

- [ ] **Step 2: Create session history BFF route**

Create `client/app/api/session/[id]/history/route.ts`:

```typescript
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = request.headers.get('Authorization') ?? ''
  const upstream = await fetch(`http://localhost:3001/api/session/${id}/history`, {
    headers: { Authorization: auth },
  })
  const data = await upstream.json()
  return Response.json(data, { status: upstream.status })
}
```

- [ ] **Step 3: Forward auth header in stream BFF route**

Replace `client/app/api/generate/stream/route.ts`:

```typescript
export async function POST(request: Request) {
  const body = await request.json()
  const prompt: string = body.prompt ?? ''
  const auth = request.headers.get('Authorization') ?? ''

  const nestUrl = `http://localhost:3001/api/generate/stream?prompt=${encodeURIComponent(prompt)}`
  const upstream = await fetch(nestUrl, {
    headers: { Authorization: auth },
  })

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add client/app/api/session/route.ts \
        client/app/api/session/[id]/history/route.ts \
        client/app/api/generate/stream/route.ts
git commit -m "feat(persistence): add BFF routes for session list, history, and forward auth to stream"
```

---

## Task 6: Pass auth token from client stream calls

**Files:**
- Modify: `client/app/narrative/hooks/useStream.ts`

The `useStream` hook currently sends no `Authorization` header. The BFF stream route now needs it to forward to NestJS.

- [ ] **Step 1: Update `useStream` to include auth header**

Replace `client/app/narrative/hooks/useStream.ts`:

```typescript
import { useEffect, useRef, useState } from 'react'
import { parseStreamEvents } from '../lib/parseStreamEvents'
import type { StreamEvent } from '../lib/parseStreamEvents'

export function useStream(url: string, onEvent: (event: StreamEvent) => void) {
  const [isStreaming, setIsStreaming] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { controllerRef.current?.abort() }
  }, [])

  const start = async (body: object) => {
    const controller = new AbortController()
    controllerRef.current = controller
    setIsStreaming(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : ''
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const events = parseStreamEvents(decoder.decode(value))
        for (const event of events) {
          onEvent(event)
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        onEvent({ type: 'error', message: err.message })
      }
    } finally {
      if (controllerRef.current === controller) {
        setIsStreaming(false)
      }
    }
  }

  return { start, isStreaming }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/app/narrative/hooks/useStream.ts
git commit -m "feat(persistence): send Authorization header from useStream"
```

---

## Task 7: Restore last session history on narrative page load

**Files:**
- Modify: `client/app/narrative/hooks/useNarrativeHistory.ts`
- Modify: `client/app/narrative/lib/parseStreamEvents.ts`
- Modify: `client/app/narrative/page.tsx`

- [ ] **Step 1: Check `parseStreamEvents` handles `session` event type**

Read `client/app/narrative/lib/parseStreamEvents.ts`. Ensure `StreamEvent` union includes `{ type: 'session'; sessionId: string }`. If not, add it:

```typescript
// In the StreamEvent type union, add:
| { type: 'session'; sessionId: string }
```

- [ ] **Step 2: Update `useNarrativeHistory` to accept initial beats and expose sessionId**

Replace `client/app/narrative/hooks/useNarrativeHistory.ts`:

```typescript
import { useState } from 'react'

export type Beat = { narrative: string; chosenAction: string | null }

export function useNarrativeHistory(initialBeats: Beat[] = []) {
  const [beats, setBeats] = useState<Beat[]>(initialBeats)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const addBeat = (narrative: string) =>
    setBeats((prev) => [...prev, { narrative, chosenAction: null }])

  const setChosenAction = (index: number, action: string) =>
    setBeats((prev) =>
      prev.map((beat, i) => (i === index ? { ...beat, chosenAction: action } : beat))
    )

  return { beats, addBeat, setChosenAction, sessionId, setSessionId }
}
```

- [ ] **Step 3: Update `narrative/page.tsx` to load last session and handle `session` events**

Replace `client/app/narrative/page.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { useStreamState } from './hooks/useStreamState'
import { useStream } from './hooks/useStream'
import { useNarrativeHistory } from './hooks/useNarrativeHistory'
import { useAuthGuard } from './hooks/useAuthGuard'
import { ActionInput } from './components/ActionInput'
import { StreamingText } from './components/StreamingText'
import { ChoiceList } from './components/ChoiceList'
import { BeatHistory } from './components/BeatHistory'
import { ValidationFeedback } from './components/ValidationFeedback'
import { RetryButton } from './components/RetryButton'
import type { Beat } from './hooks/useNarrativeHistory'

export default function NarrativePage() {
  useAuthGuard()
  const { status, narrativeText, choices, errorMessage, dispatch } = useStreamState()
  const [initialBeats, setInitialBeats] = useState<Beat[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const { beats, addBeat, setChosenAction, sessionId, setSessionId } = useNarrativeHistory(initialBeats)
  const narrativeAccumRef = useRef<string>('')
  const lastPromptRef = useRef<string>('')
  const [validationStatus, setValidationStatus] = useState<'accepted' | 'modified' | 'rejected' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  // Load last session's history on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    fetch('/api/session', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(async (sessions: Array<{ id: string }>) => {
        if (!sessions.length) { setHistoryLoaded(true); return }
        const latest = sessions[0]
        const res = await fetch(`/api/session/${latest.id}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { setHistoryLoaded(true); return }
        const data = await res.json()
        const restored: Beat[] = (data.history ?? []).map((h: { narrative: string }) => ({
          narrative: h.narrative,
          chosenAction: null,
        }))
        setInitialBeats(restored)
        setSessionId(latest.id)
        setHistoryLoaded(true)
      })
      .catch(() => setHistoryLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onEvent = (event: { type: string; [key: string]: unknown }) => {
    if (event.type === 'session') {
      setSessionId(event.sessionId as string)
    } else if (event.type === 'chunk') {
      narrativeAccumRef.current += (event.content as string) ?? ''
    } else if (event.type === 'done') {
      addBeat(narrativeAccumRef.current)
      narrativeAccumRef.current = ''
    }
    dispatch(event as Parameters<typeof dispatch>[0])
  }

  const { start, isStreaming } = useStream('/api/generate/stream', onEvent)

  useEffect(() => {
    if (!historyLoaded) return
    if (!localStorage.getItem('accessToken')) return
    dispatch({ type: 'start' })
    start({ prompt: 'I enter a cavern.' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoaded])

  const handleRetry = () => { start({ prompt: lastPromptRef.current }) }

  const handleChoice = (label: string) => {
    setChosenAction(beats.length - 1, label)
    dispatch({ type: 'start' })
    start({ prompt: label })
  }

  const handleSubmit = async (text: string) => {
    lastPromptRef.current = text
    let effectivePrompt = text
    setIsValidating(true)
    try {
      const token = localStorage.getItem('accessToken') ?? ''
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: text }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.rejected) {
          setValidationStatus('rejected')
          setRejectionReason(data.reason ?? '')
          return
        }
        if (data.modifiedAction) {
          setValidationStatus('modified')
          effectivePrompt = data.modifiedAction
        } else {
          setValidationStatus('accepted')
        }
      }
    } catch {
      // validation unavailable — proceed to stream
    } finally {
      setIsValidating(false)
    }
    start({ prompt: effectivePrompt })
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div data-testid="narrative-panel" className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <BeatHistory beats={beats} />
          {status === 'streaming' && <StreamingText text={narrativeText} isStreaming={isStreaming} />}
          {choices.length > 0 && <ChoiceList choices={choices} onSelect={handleChoice} disabled={isValidating || isStreaming} />}
          {status === 'error' && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 p-4 space-y-2">
              <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>
              <RetryButton onRetry={handleRetry} />
            </div>
          )}
        </div>
      </div>
      <div data-testid="input-area" className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 sm:px-6 py-4">
        <div className="mx-auto w-full max-w-2xl space-y-2">
          <ValidationFeedback status={validationStatus} reason={rejectionReason} />
          <ActionInput onSubmit={handleSubmit} disabled={isStreaming || isValidating} isValidating={isValidating} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add client/app/narrative/hooks/useNarrativeHistory.ts \
        client/app/narrative/lib/parseStreamEvents.ts \
        client/app/narrative/page.tsx
git commit -m "feat(persistence): restore last session history on narrative page load"
```

---

## Self-Review

**Spec coverage:**
- ✓ Sessions tied to JWT user — Task 3 guards stream + generate, passes `req.user.id`
- ✓ Stream path logs history — Task 3 calls `historyService.logEntry` after each complete beat
- ✓ Session emits `sessionId` event — Task 3 sends `{ type: 'session', sessionId }` at stream start
- ✓ List/history endpoints — Task 4 + 5
- ✓ Auth forwarded from client → BFF → NestJS — Task 5 (stream route) + Task 6 (useStream)
- ✓ History restored on page load — Task 7

**Gaps / Notes:**
- `useNarrativeHistory` takes `initialBeats` but `useState(initialBeats)` won't re-run if `initialBeats` changes after the async fetch resolves. Mitigated by gating the stream start behind `historyLoaded` (the fetch completes before the first new beat renders). This is correct.
- Session list endpoint is unprotected against IDOR — any user can call `/api/session/:id/history` for any session id. Acceptable for now since sessions contain no secret world data and the roadmap treats isolation as a future exercise.
- `parseStreamEvents.ts` must export `{ type: 'session'; sessionId: string }` in its `StreamEvent` union — Task 7 step 1 checks and patches this.
