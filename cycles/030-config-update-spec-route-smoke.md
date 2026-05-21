---
id: cycle-030
slug: config-update-spec-route-smoke
status: done
source: "§7 Config Editor UI — PUT /api/config/update-spec route"
covers: happy-path
group: config-editor
boundary-covered-by: "cycle-028"
---

## Dependencies

**(none — routing smoke; fs boundary covered by cycle-028/029)**

## Behavior
A `ConfigController` with routes `GET /config/update-spec` (returns spec) and `PUT /config/update-spec` (writes spec) exists. The PUT route delegates to `ConfigService.updateSpec(body)`. Routing smoke verifies both routes delegate correctly.

## RED
- **Test file**: `src/config/config.controller.spec.ts`
- **Assertion**:
  ```ts
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
  ```
- **Why it fails**: `ConfigController` does not exist, and `ConfigService.updateSpec` does not exist.

## GREEN
- **Smallest change**: Create `src/config/config.controller.ts` with `@Controller('config') ConfigController` with `@Get('update-spec')` calling `this.configService.getSpec()` and `@Put('update-spec') @HttpCode(200)` calling `this.configService.updateSpec(body)`. Add `async updateSpec(spec: unknown): Promise<void>` to `ConfigService` calling `writeFile(path, JSON.stringify(spec, null, 2), 'utf-8')`. Create `src/config/config.module.ts` and register in `AppModule`.
- **Files touched**: `src/config/config.controller.ts`, `src/config/config.service.ts`, `src/config/config.module.ts`, `src/app.module.ts`

## REFACTOR
none
