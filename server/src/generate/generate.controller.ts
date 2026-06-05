import { Body, Controller, HttpCode, HttpStatus, Post, Query, Request, Sse, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
    return new Observable((subscriber) => {
      const abort = new AbortController();

      (async () => {
        try {
          const userId: string = req.user?.id
          const sessionId = await this.sessionService.createSession(userId);
          const { ruleContext, worldContext, anchorId } = await this.buildContexts(query.prompt);
          const outcome = await this.validatorService.validate(query.prompt, ruleContext);

          if (outcome.result === 'rejected') {
            subscriber.next({ data: { type: 'rejected', reason: outcome.reason } });
            subscriber.complete();
            return;
          }

          subscriber.next({ data: { type: 'session', sessionId } });

          const effectivePrompt = outcome.result === 'modified' && outcome.modifiedAction
            ? outcome.modifiedAction
            : query.prompt;

          if (outcome.result === 'modified' && outcome.modifiedAction) {
            subscriber.next({ data: { type: 'modified', modifiedAction: outcome.modifiedAction } });
          }

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
    const sessionId = await this.sessionService.createSession(req.user?.id);

    if (body.deltas?.length) {
      const { flaggedForReEmbed } = await this.engineService.processDeltas(body.deltas, defaultSpec);
      for (const d of flaggedForReEmbed) {
        if (d.entityId) void this.embeddingService.embedEntityIdentity(d.entityId);
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
      const identity = [e.archetype, e.role, e.backstory, e.sensoryProfile].filter(Boolean).join('; ');
      const stateStr = e.state && Object.keys(e.state).length ? JSON.stringify(e.state) : null;
      const extras = [identity, stateStr].filter(Boolean).join(' | ');
      return `- ${e.name} (${e.type})${extras ? `: ${extras}` : ''}`;
    }).join('\n')}`;
  }
}
