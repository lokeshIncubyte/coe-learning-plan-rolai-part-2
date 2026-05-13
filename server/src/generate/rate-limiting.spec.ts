import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { GenerateController } from './generate.controller';
import { NarrativeGeneratorService } from './narrative-generator.service';

describe('Rate limiting', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1 }])],
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('ok') } },
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
