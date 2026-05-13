import { Test, TestingModule } from '@nestjs/testing'
import { GenerateController } from './generate.controller'
import { NarrativeGeneratorService } from './narrative-generator.service'

describe('GenerateController', () => {
  let controller: GenerateController
  let service: NarrativeGeneratorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn() } },
      ],
    }).compile()

    controller = module.get(GenerateController)
    service = module.get(NarrativeGeneratorService)
  })

  it('calls service with prompt and returns narrative and choices', async () => {
    const generateMock = service.generate as jest.Mock
    generateMock.mockResolvedValueOnce('Once upon a time...')

    const result = await controller.generate({ prompt: 'Write beat 1' })

    expect(generateMock).toHaveBeenCalledWith('Write beat 1')
    expect(result).toEqual({
      narrative: 'Once upon a time...',
      choices: ['Investigate', 'Flee', 'Negotiate'],
    })
  })
})
