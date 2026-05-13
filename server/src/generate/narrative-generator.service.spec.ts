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

  it('initialises when OPENROUTER_API_KEY is present', async () => {
    const module = await Test.createTestingModule({
      providers: [
        NarrativeGeneratorService,
        { provide: ConfigService, useValue: makeConfigMock(() => 'test-key') },
      ],
    }).compile()

    expect(module.get(NarrativeGeneratorService)).toBeDefined()
  })

  it('throws on init when OPENROUTER_API_KEY is missing', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          NarrativeGeneratorService,
          {
            provide: ConfigService,
            useValue: makeConfigMock(() => {
              throw new Error('Config validation error: OPENROUTER_API_KEY is missing')
            }),
          },
        ],
      }).compile(),
    ).rejects.toThrow('OPENROUTER_API_KEY')
  })
})

