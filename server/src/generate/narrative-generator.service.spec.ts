import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { NarrativeGeneratorService } from './narrative-generator.service'

const makeConfigMock = (getOrThrow: () => string): Partial<ConfigService> => ({
  getOrThrow: jest.fn().mockImplementation(getOrThrow),
  get: jest.fn(),
})

describe('NarrativeGeneratorService', () => {
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
