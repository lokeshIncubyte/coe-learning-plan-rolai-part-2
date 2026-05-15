import { Test, TestingModule } from '@nestjs/testing'
import { ActionValidatorService } from './action-validator.service'

describe('ActionValidatorService', () => {
  let service: ActionValidatorService

  describe('validate — accepted result', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ActionValidatorService,
          {
            provide: 'ACTION_VALIDATOR_AGENT',
            useValue: {
              generate: jest.fn().mockResolvedValueOnce({
                object: { result: 'accepted', reason: 'Plausible action.' },
              }),
            },
          },
        ],
      }).compile()

      service = module.get(ActionValidatorService)
    })

    it('returns the parsed object from agent.generate', async () => {
      const outcome = await service.validate('I pick the lock')
      expect(outcome).toEqual({ result: 'accepted', reason: 'Plausible action.' })
    })
  })
})
