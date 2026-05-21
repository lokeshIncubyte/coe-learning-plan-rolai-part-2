import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GenerateController } from './generate.controller';
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

describe('Rate limiting', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1 }])],
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('ok'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'approved' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue(['Investigate', 'Flee', 'Negotiate']) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockReturnValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows first request and rejects second with 429', async () => {
    await request(app.getHttpServer())
      .post('/generate')
      .send({ prompt: 'test' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/generate')
      .send({ prompt: 'test' })
      .expect(429);
  });
});
