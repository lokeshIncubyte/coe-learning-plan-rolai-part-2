import { Body, Controller, HttpCode, HttpStatus, Post, Query, Sse, UseFilters, UseInterceptors } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { ActionValidatorService } from '../agents/action-validator.service';
import { ChoiceGeneratorService } from '../agents/choice-generator.service';
import { GraphService } from './graph.service';
import { OpenAiExceptionFilter } from './openai-exception.filter';
import { LoggingInterceptor } from './logging.interceptor';

export class GenerateRequestDto {
  prompt: string;
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
  ) {}

  @Sse('stream')
  stream(@Query() query: { prompt: string }): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const abort = new AbortController();

      (async () => {
        subscriber.next({ data: { type: 'start' } });
        try {
          let fullNarrative = '';
          for await (const token of this.narrativeService.stream(query.prompt, abort.signal)) {
            if (subscriber.closed) break;
            fullNarrative += token;
            subscriber.next({ data: { type: 'chunk', content: token } });
          }
          if (!subscriber.closed) {
            const choices = await this.choiceGeneratorService.generateChoices(fullNarrative, '');
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
    const rules = await this.graphService.getEntitiesByType('rule');
    const ruleContext = rules.length
      ? `RULES:\n${rules.map((r: any) => `- ${r.name}: ${(r.facts as any)?.description ?? ''}`).join('\n')}`
      : '';

    const chars = await this.graphService.getEntitiesByType('character');
    const locs = await this.graphService.getEntitiesByType('location');
    const objs = await this.graphService.getEntitiesByType('object');
    const allEntities = [...chars, ...locs, ...objs];
    const worldContext = allEntities.length
      ? `WORLD:\n${allEntities.map((e: any) => `- ${e.name} (${e.type})`).join('\n')}`
      : '';

    const outcome = await this.validatorService.validate(body.prompt, ruleContext);
    if (outcome.result === 'rejected') {
      return { rejected: true, reason: outcome.reason };
    }
    const narrative = await this.narrativeService.generate(body.prompt);
    const choices = await this.choiceGeneratorService.generateChoices(narrative, worldContext);
    return { narrative, choices };
  }
}
