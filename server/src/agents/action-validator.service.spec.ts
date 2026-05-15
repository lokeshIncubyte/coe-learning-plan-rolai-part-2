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

  describe('validate — rejected result with modifiedAction undefined', () => {
    let agentMock: { generate: jest.Mock }

    beforeEach(async () => {
      agentMock = {
        generate: jest.fn().mockResolvedValueOnce({
          object: { result: 'rejected', reason: 'Impossible.', modifiedAction: undefined },
        }),
      }
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ActionValidatorService,
          { provide: 'ACTION_VALIDATOR_AGENT', useValue: agentMock },
        ],
      }).compile()

      service = module.get(ActionValidatorService)
    })

    it('passes the object through including undefined modifiedAction', async () => {
      const outcome = await service.validate('Phase through the wall')
      expect(outcome).toEqual({
        result: 'rejected',
        reason: 'Impossible.',
        modifiedAction: undefined,
      })
      expect(agentMock.generate).toHaveBeenCalledWith(
        'Phase through the wall',
        expect.objectContaining({ structuredOutput: expect.anything() }),
      )
    })
  })
})
