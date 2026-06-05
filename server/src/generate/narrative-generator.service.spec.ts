import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { NarrativeGeneratorService } from './narrative-generator.service'

const makeConfigMock = (getOrThrow: () => string): Partial<ConfigService> => ({
  getOrThrow: jest.fn().mockImplementation(getOrThrow),
  get: jest.fn(),
})

describe('NarrativeGeneratorService', () => {
  describe('generate', () => {
    let module: TestingModule

    afterEach(async () => {
      await module.close()
    })

    it('calls OpenAI with system + user prompt and returns content', async () => {
      module = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          { provide: ConfigService, useValue: makeConfigMock(() => 'test-key') },
        ],
      }).compile()

      const service = module.get(NarrativeGeneratorService)
      const createSpy = jest
        .spyOn((service as any).client.chat.completions, 'create')
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Once upon a time...' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        } as any)

      const result = await service.generate('Write beat 1')

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            { role: 'user', content: 'Write beat 1' },
          ]),
        }),
      )
      expect(result).toBe('Once upon a time...')
    })
  })

  it('initialises when MISTRAL_API_KEY is present', async () => {
    const module = await Test.createTestingModule({
      providers: [
        NarrativeGeneratorService,
        { provide: ConfigService, useValue: makeConfigMock(() => 'test-key') },
      ],
    }).compile()

    expect(module.get(NarrativeGeneratorService)).toBeDefined()
  })

  it('throws on init when MISTRAL_API_KEY is missing', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          {
            provide: ConfigService,
            useValue: makeConfigMock(() => {
              throw new Error('Config validation error: MISTRAL_API_KEY is missing')
            }),
          },
        ],
      }).compile(),
    ).rejects.toThrow('MISTRAL_API_KEY')
  })

  describe('stream', () => {
    let module: TestingModule;

    afterEach(async () => {
      await module.close();
    });

    it('yields content tokens from OpenAI async iterable', async () => {
      module = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          { provide: ConfigService, useValue: makeConfigMock(() => 'test-key') },
        ],
      }).compile();

      const service = module.get(NarrativeGeneratorService);
      async function* mockStream() {
        yield { choices: [{ delta: { content: 'Hello' }, finish_reason: null }] };
        yield { choices: [{ delta: { content: ' world' }, finish_reason: 'stop' }] };
      }
      jest
        .spyOn((service as any).client.chat.completions, 'create')
        .mockResolvedValueOnce(mockStream() as any);

      const tokens: string[] = [];
      for await (const token of service.stream('test prompt')) {
        tokens.push(token);
      }
      expect(tokens).toEqual(['Hello', ' world']);
    });

    it('skips chunks with no content (role/finish events)', async () => {
      module = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          { provide: ConfigService, useValue: makeConfigMock(() => 'test-key') },
        ],
      }).compile();

      const service = module.get(NarrativeGeneratorService);
      async function* mockStream() {
        yield { choices: [{ delta: {}, finish_reason: null }] };
        yield { choices: [{ delta: { content: 'Hi' }, finish_reason: null }] };
        yield { choices: [{ delta: { content: null }, finish_reason: 'stop' }] };
      }
      jest
        .spyOn((service as any).client.chat.completions, 'create')
        .mockResolvedValueOnce(mockStream() as any);

      const tokens: string[] = [];
      for await (const token of service.stream('test prompt')) {
        tokens.push(token);
      }
      expect(tokens).toEqual(['Hi']);
    });
  });

  describe('worldContext injection', () => {
    let module: TestingModule;
    afterEach(async () => { await module.close(); });

    it('includes WORLD CONTEXT block in system prompt when worldContext is provided', async () => {
      module = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:4000'), getOrThrow: jest.fn().mockReturnValue('test') } },
        ],
      }).compile();
      const service = module.get(NarrativeGeneratorService);
      const createSpy = jest.spyOn((service as any).client.chat.completions, 'create')
        .mockResolvedValueOnce({ choices: [{ message: { content: 'narrative' } }] } as any);

      await service.generate('test prompt', 'WORLD:\n- Mira (character)');

      const call = createSpy.mock.calls[0][0] as any;
      const systemMsg = call.messages.find((m: any) => m.role === 'system');
      expect(systemMsg.content).toContain('Mira');
    });

    it('does NOT add WORLD CONTEXT when worldContext is empty', async () => {
      module = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:4000'), getOrThrow: jest.fn().mockReturnValue('test') } },
        ],
      }).compile();
      const service = module.get(NarrativeGeneratorService);
      const createSpy = jest.spyOn((service as any).client.chat.completions, 'create')
        .mockResolvedValueOnce({ choices: [{ message: { content: 'narrative' } }] } as any);

      await service.generate('test prompt', '');

      const call = createSpy.mock.calls[0][0] as any;
      const systemMsg = call.messages.find((m: any) => m.role === 'system');
      expect(systemMsg.content).not.toContain('WORLD CONTEXT');
    });
  });

  describe('OpenRouter-only chat routing', () => {
    it('uses OpenRouter baseURL even when HELPER_APIS_URL is set', async () => {
      const mod = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue('http://localhost:4000'),
              getOrThrow: jest.fn().mockReturnValue('test-or-key'),
            },
          },
        ],
      }).compile()
      const svc = mod.get(NarrativeGeneratorService)
      expect((svc as any).client.baseURL).toContain('mistral.ai')
    })

    it('uses MISTRAL_API_KEY even when HELPER_APIS_URL is set', async () => {
      const mod = await Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue('http://localhost:4000'),
              getOrThrow: jest.fn().mockReturnValue('or-key-xyz'),
            },
          },
        ],
      }).compile()
      const svc = mod.get(NarrativeGeneratorService)
      expect((svc as any).client.apiKey).toBe('or-key-xyz')
    })
  })
})

