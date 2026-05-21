import { Test, TestingModule } from '@nestjs/testing'
import { ConfigController } from './config.controller'
import { ConfigService as AppConfigService } from './config.service'

describe('ConfigController routing smoke', () => {
  let controller: ConfigController
  let getSpec: jest.Mock
  let updateSpec: jest.Mock

  beforeEach(async () => {
    getSpec = jest.fn().mockResolvedValue({ variables: {} })
    updateSpec = jest.fn().mockResolvedValue(undefined)
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [{
        provide: AppConfigService,
        useValue: { getSpec, updateSpec },
      }],
    }).compile()
    controller = module.get(ConfigController)
  })

  it('getSpec delegates to configService.getSpec', async () => {
    const result = await controller.getSpec()
    expect(result).toEqual({ variables: {} })
  })

  it('updateSpec delegates to configService.updateSpec with body', async () => {
    const body = { variables: { hp: { min: 0, max: 100 } } }
    await controller.updateSpec(body)
    expect(updateSpec).toHaveBeenCalledWith(body)
  })
})
