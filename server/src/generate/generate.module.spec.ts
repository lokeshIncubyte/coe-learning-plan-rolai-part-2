jest.mock('@mastra/core/agent', () => ({ Agent: class {} }))

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GenerateModule } from './generate.module';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { GraphService } from './graph.service';
import { StateService } from './state.service';
import { EngineService } from './engine.service';

describe('GenerateModule', () => {
  let module: TestingModule;

  afterEach(async () => {
    await module.close();
  });

  it('compiles and resolves all services', async () => {
    module = await Test.createTestingModule({
      imports: [GenerateModule],
    })
      .overrideProvider(ConfigService)
      .useValue({ getOrThrow: jest.fn().mockReturnValue('test-key'), get: jest.fn() })
      .compile();

    expect(module.get(NarrativeGeneratorService)).toBeDefined();
    expect(module.get(GraphService)).toBeDefined();
    expect(module.get(StateService)).toBeDefined();
    expect(module.get(EngineService)).toBeDefined();
  });
});
