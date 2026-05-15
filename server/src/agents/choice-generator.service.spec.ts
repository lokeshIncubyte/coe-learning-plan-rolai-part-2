import { Test, TestingModule } from '@nestjs/testing'
import { ChoiceGeneratorService } from './choice-generator.service'

describe('ChoiceGeneratorService', () => {
  let service: ChoiceGeneratorService
  let agentMock: { generate: jest.Mock }

  beforeEach(async () => {
    agentMock = {
      generate: jest.fn().mockResolvedValue({
        object: {
          choices: [{ label: 'Investigate', entities: ['door'], rules: ['rule-1'] }],
        },
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChoiceGeneratorService,
        { provide: 'CHOICE_GENERATOR_AGENT', useValue: agentMock },
      ],
    }).compile()

    service = module.get(ChoiceGeneratorService)
  })

  it('returns the parsed choices array from agent.generate', async () => {
    const choices = await service.generateChoices('narrative text')
    expect(choices).toEqual([{ label: 'Investigate', entities: ['door'], rules: ['rule-1'] }])
  })

  it('calls agent.generate with the narrative and a structured output schema', async () => {
    await service.generateChoices('narrative text')
    expect(agentMock.generate).toHaveBeenCalledWith(
      'narrative text',
      expect.objectContaining({ structuredOutput: expect.anything() }),
    )
  })
})
