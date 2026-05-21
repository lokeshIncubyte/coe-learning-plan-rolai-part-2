import { Body, Controller, HttpCode, HttpStatus, Post, Query, Sse, UseFilters, UseInterceptors } from '@nestjs/common';
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
  ) {}

  @Sse('stream')
  stream(@Query() query: { prompt: string }): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const abort = new AbortController();

      (async () => {
        try {
          const { ruleContext, worldContext } = await this.buildContexts(query.prompt);
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

          subscriber.next({ data: { type: 'start' } });
          let fullNarrative = '';
          for await (const token of this.narrativeService.stream(effectivePrompt, abort.signal, worldContext)) {
            if (subscriber.closed) break;
            fullNarrative += token;
            subscriber.next({ data: { type: 'chunk', content: token } });
          }
          if (!subscriber.closed) {
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

  @Post()
  @HttpCode(HttpStatus.OK)
  async generate(@Body() body: GenerateRequestDto) {
    if (body.deltas?.length) {
      const { flaggedForReEmbed } = await this.engineService.processDeltas(body.deltas, defaultSpec);
      for (const d of flaggedForReEmbed) {
        void this.embeddingService.embedEntityIdentity(d.entityId);
      }
    }
    const { ruleContext, worldContext } = await this.buildContexts(body.prompt);

    const outcome = await this.validatorService.validate(body.prompt, ruleContext);
    if (outcome.result === 'rejected') {
      return { rejected: true, reason: outcome.reason };
    }

    const effectivePrompt = outcome.result === 'modified' && outcome.modifiedAction
      ? outcome.modifiedAction
      : body.prompt;

    const narrative = await this.narrativeService.generate(effectivePrompt, worldContext);
    const choices = await this.choiceGeneratorService.generateChoices(narrative, worldContext);
    return { narrative, choices };
  }

  private async buildContexts(prompt: string): Promise<{ ruleContext: string; worldContext: string }> {
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

    return { ruleContext, worldContext };
  }

  private buildWorldContext(entities: any[]): string {
    if (!entities.length) return '';
    return `WORLD:\n${entities.map((e) => {
      const extras = [e.archetype, e.role, e.state ? JSON.stringify(e.state) : null].filter(Boolean).join(', ');
      return `- ${e.name} (${e.type})${extras ? `: ${extras}` : ''}`;
    }).join('\n')}`;
  }
}
